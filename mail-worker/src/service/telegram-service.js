import orm from '../entity/orm';
import email from '../entity/email';
import settingService from './setting-service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
import { eq } from 'drizzle-orm';
import jwtUtils from '../utils/jwt-utils';
import emailMsgTemplate from '../template/email-msg';
import emailTextTemplate from '../template/email-text';
import emailHtmlTemplate from '../template/email-html';
import verifyUtils from '../utils/verify-utils';
import domainUtils from "../utils/domain-uitls";

const telegramService = {

	async getEmailContent(c, params) {

		const { token } = params

		const result = await jwtUtils.verifyToken(c, token);

		if (!result) {
			return emailTextTemplate('Access denied')
		}

		const emailRow = await orm(c).select().from(email).where(eq(email.emailId, result.emailId)).get();

		if (emailRow) {

			if (emailRow.content) {
				const { r2Domain } = await settingService.query(c);
				return emailHtmlTemplate(emailRow.content || '', r2Domain)
			} else {
				return emailTextTemplate(emailRow.text || '')
			}

		} else {
			return emailTextTemplate('The email does not exist')
		}

	},

	parseTargets(str) {

		return str.split(',').map(item => item.trim()).filter(item => item).map(item => {

			let chatId = item;
			let filters = [];

			const index = item.indexOf(':');

			if (index > -1) {
				chatId = item.slice(0, index);
				filters = item.slice(index + 1).split('|').map(filter => filter.trim().toLowerCase()).filter(filter => filter && filter !== 'all');
			}

			return { chatId, filters };

		});

	},

	isMatch(filters, addresses) {

		if (filters.length === 0) return true;

		return filters.some(raw =>
			addresses.some(address => {
				const filter = String(raw).toLowerCase();
				if (filter.startsWith('*')) return address.endsWith(filter.slice(1));
				if (filter.endsWith('*')) return address.startsWith(filter.slice(0, -1));
				return address === filter;
			})
		);

	},

	async sendEmailToBot(c, email) {

		const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);

		//chat_id 支持三种写法: `chatid` 收全部 / `chatid:all` 收全部 / `chatid:pattern1|pattern2` 只收匹配收件地址,pattern 支持 * 通配(如 *@example.com)
		const targets = this.parseTargets(tgChatId);

		const receiveAddresses = new Set([(email.toEmail || '').toLowerCase()]);

		try {
			const recipients = JSON.parse(email.recipient || '[]');
			recipients.forEach(item => {
				const address = typeof item === 'string' ? item : (item && item.address);
				if (address) receiveAddresses.add(String(address).toLowerCase());
			});
		} catch (e) {
			console.error('解析 TG 通知收件人异常:', e);
		}

		const receivers = targets.filter(target => this.isMatch(target.filters, Array.from(receiveAddresses)));

		if (receivers.length === 0) return;

		const jwtToken = await jwtUtils.generateToken(c, { emailId: email.emailId })

		const webAppUrl = customDomain ? `${domainUtils.toOssDomain(customDomain)}/api/telegram/getEmail/${jwtToken}` : 'https://www.cloudflare.com/404'
		const inlineKeyboard = [
			[
				{
					text: 'View',
					web_app: { url: webAppUrl }
				}
			]
		];

		if (email.code) {
			inlineKeyboard.push([
				{
					text: email.code,
					copy_text: { text: email.code }
				}
			]);
		}

		await Promise.all(receivers.map(async receiver => {
			try {
				const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						chat_id: receiver.chatId,
						parse_mode: 'HTML',
						text: emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText),
						reply_markup: {
							inline_keyboard: inlineKeyboard
						}
					})
				});
				if (!res.ok) {
					console.error(`转发 Telegram 失败 status: ${res.status} response: ${await res.text()}`);
				}
			} catch (e) {
				console.error(`转发 Telegram 失败:`, e.message);
			}
		}));

	}

}

export default telegramService
