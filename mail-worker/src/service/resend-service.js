import emailService from './email-service';
import { emailConst } from '../const/entity-const';
import BizError from '../error/biz-error';

const resendService = {

	async webhooks(c, body) {

		//SMTP2GO webhook
		if (body.event) {
			return this.smtp2goWebhooks(c, body);
		}

		const params = {
			resendEmailId: body.data.email_id,
			status: emailConst.status.SENT
		}

		if (body.type === 'email.delivered') {
			params.status = emailConst.status.DELIVERED
			params.message = null
		}

		if (body.type === 'email.complained') {
			params.status = emailConst.status.COMPLAINED
			params.message = null
		}

		if (body.type === 'email.bounced') {
			let bounce = body.data.bounce
			bounce = JSON.stringify(bounce);
			params.status = emailConst.status.BOUNCED
			params.message = bounce
		}

		if (body.type === 'email.delivery_delayed') {
			params.status = emailConst.status.DELAYED
			params.message = null
		}

		if (body.type === 'email.failed') {
			params.status = emailConst.status.FAILED
			params.message = body.data.failed.reason
		}

		const emailRow = await emailService.updateEmailStatus(c, params)

		if (!emailRow) {
			throw new BizError('更新邮件状态记录失败');
		}

	},

	async smtp2goWebhooks(c, body) {

		const params = {
			resendEmailId: body.email_id,
			status: emailConst.status.SENT
		}

		if (body.event === 'delivered') {
			params.status = emailConst.status.DELIVERED
			params.message = null
		}

		if (body.event === 'spam') {
			params.status = emailConst.status.COMPLAINED
			params.message = null
		}

		if (body.event === 'bounce') {
			params.status = emailConst.status.BOUNCED
			params.message = body.context || null
		}

		if (params.status === emailConst.status.SENT) {
			return;
		}

		const emailRow = await emailService.updateEmailStatus(c, params)

		if (!emailRow) {
			throw new BizError('更新邮件状态记录失败');
		}

	}
}

export default resendService
