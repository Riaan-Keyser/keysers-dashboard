export const emailConfig = {
  from: process.env.FROM_EMAIL || "noreply@keysers.co.za",
  adminEmail: process.env.ADMIN_EMAIL || "admin@keysers.co.za",
  companyName: process.env.COMPANY_NAME || "Keysers",
  companyWebsite: process.env.COMPANY_WEBSITE || "https://keysers.co.za",
  dashboardUrl: process.env.DASHBOARD_URL || "http://localhost:3000",
}

export function getQuoteUrl(token: string): string {
  return `${emailConfig.dashboardUrl}/quote/${token}`
}

export function getAcceptUrl(token: string): string {
  return `${emailConfig.dashboardUrl}/quote/${token}/accept`
}

export function getDeclineUrl(token: string): string {
  return `${emailConfig.dashboardUrl}/quote/${token}/decline`
}

export function getDashboardPurchaseUrl(purchaseId: string): string {
  return `${emailConfig.dashboardUrl}/dashboard/incoming?highlight=${purchaseId}`
}
