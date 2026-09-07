import frappe
from frappe.www.login import get_context as original_get_context

def get_context(context):
	frappe.local.lang = "vi"
	context = original_get_context(context)
	context["logo"] = "/assets/bfarm/images/logo.png"
	context["app_name"] = "Bfarm"
	context["title"] = "Đăng nhập"
	return context
