import frappe
from frappe.www.login import get_context as original_get_context

def get_context(context):
	# Ép ngôn ngữ ngữ cảnh trang đăng nhập về Tiếng Việt ("vi")
	frappe.local.lang = "vi"
	context = original_get_context(context)
	context["logo"] = "/assets/bfarm/images/logo.png"
	context["app_name"] = "Bfarm"
	context["title"] = "Đăng nhập"
	return context

