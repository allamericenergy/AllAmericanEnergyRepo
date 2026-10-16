import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
async function loadConfiguration() {
    try {
        const rows = await prisma.$queryRawUnsafe(`
      SELECT TOP (1)
        SMTPServer,
        Port,
        Authentication,
        Username,
        Password,
        EnableSSL,
        FromEmail
      FROM dbo.tbl_SMTPConfig
      ORDER BY onDate DESC, id DESC
    `);
        const row = rows[0];
        if (!row)
            return null;
        const host = row.SMTPServer.trim();
        if (!host)
            return null;
        const portValue = Number(row.Port.trim());
        const authentication = ["enabled", "true", "1", "yes", "on"].includes(row.Authentication.trim().toLowerCase());
        const username = row.Username.trim();
        const password = row.Password.trim();
        if (authentication && (!username || !password))
            return null;
        return {
            host,
            port: Number.isInteger(portValue) && portValue > 0 ? portValue : 587,
            username,
            password,
            fromEmail: row.FromEmail.trim() || "support@ienergybill.com",
            enableSsl: row.EnableSSL,
            authentication
        };
    }
    catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2010")
            return null;
        throw error;
    }
}
function createTransport(config) {
    const implicitTls = config.enableSsl && config.port === 465;
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: implicitTls,
        requireTLS: config.enableSsl && !implicitTls,
        auth: config.authentication && config.username && config.password
            ? { user: config.username, pass: config.password }
            : undefined
    });
}
function escapeHtml(value) {
    return value.replace(/[&<>"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;"
    })[character] ?? character);
}
export const emailService = {
    async isConfigured() {
        return Boolean(await loadConfiguration());
    },
    async assertConfigured() {
        if (!(await this.isConfigured())) {
            throw Object.assign(new Error("SMTP email is not configured"), { statusCode: 503 });
        }
    },
    async verifyConfiguration() {
        const config = await loadConfiguration();
        if (!config)
            throw Object.assign(new Error("SMTP email is not configured"), { statusCode: 503 });
        await createTransport(config).verify();
    },
    async sendRegistrationVerification(input) {
        const config = await loadConfiguration();
        if (!config)
            throw Object.assign(new Error("SMTP email is not configured"), { statusCode: 503 });
        const verificationUrl = new URL("/register", env.FRONTEND_URL);
        verificationUrl.searchParams.set("email", input.email);
        verificationUrl.searchParams.set("token", input.token);
        await createTransport(config).sendMail({
            from: `iEnergyBill Support <${config.fromEmail}>`,
            to: input.email,
            subject: "Verify your iEnergyBill account",
            text: `Hello ${input.firstName},\n\nPlease verify your iEnergyBill account by opening this link:\n${verificationUrl.toString()}\n\nThis link expires in 24 hours.`,
            html: `<p>Hello ${escapeHtml(input.firstName)},</p><p>Please verify your iEnergyBill account:</p><p><a href="${escapeHtml(verificationUrl.toString())}">Verify email address</a></p><p>This link expires in 24 hours.</p>`
        });
    },
    async sendMemberWelcome(input) {
        const config = await loadConfiguration();
        if (!config)
            throw Object.assign(new Error("SMTP email is not configured"), { statusCode: 503 });
        await createTransport(config).sendMail({
            from: `All American Energy Support <${config.fromEmail}>`,
            to: input.email,
            subject: "Your All American Energy member login",
            text: `Hello ${input.firstName},\n\nYour All American Energy member account has been created.\n\nLogin ID: ${input.loginEmail}\nTemporary password: ${input.temporaryPassword}\n\nSign in at ${env.FRONTEND_URL}. You will be required to create a new password immediately after signing in.`,
            html: `<p>Hello ${escapeHtml(input.firstName)},</p><p>Your All American Energy member account has been created.</p><p><strong>Login ID:</strong> ${escapeHtml(input.loginEmail)}<br><strong>Temporary password:</strong> ${escapeHtml(input.temporaryPassword)}</p><p>Sign in at <a href="${escapeHtml(env.FRONTEND_URL)}">${escapeHtml(env.FRONTEND_URL)}</a>. You will be required to create a new password immediately after signing in.</p>`
        });
    },
    async sendActivityAlert(input) {
        const config = await loadConfiguration();
        if (!config)
            return false;
        const activityUrl = new URL(input.actionPath, env.FRONTEND_URL).toString();
        await createTransport(config).sendMail({
            from: `All American Energy <${config.fromEmail}>`,
            to: input.email,
            subject: input.subject,
            text: `Hello ${input.firstName},\n\n${input.heading}\n\n${input.message}\n\nOpen Activity: ${activityUrl}`,
            html: `<p>Hello ${escapeHtml(input.firstName)},</p><p><strong>${escapeHtml(input.heading)}</strong></p><p>${escapeHtml(input.message)}</p><p><a href="${escapeHtml(activityUrl)}">Open Activity</a></p>`
        });
        return true;
    }
};
