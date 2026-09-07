import frappe
import os
import json

def sync_workspaces():
	workspace_path = frappe.get_app_path("bfarm", "workspace", "bfarm_agriculture", "bfarm_agriculture.json")
	if os.path.exists(workspace_path):
		with open(workspace_path, "r", encoding="utf-8") as f:
			data = json.load(f)
		
		name = data.get("name") or "Bfarm Agriculture"
		
		# Tạo Number Card "Completed Tasks" nếu chưa có
		if not frappe.db.exists("Number Card", "Completed Tasks"):
			card_path = frappe.get_app_path("bfarm", "number_card", "completed_tasks", "completed_tasks.json")
			if os.path.exists(card_path):
				with open(card_path, "r", encoding="utf-8") as f:
					card_data = json.load(f)
				frappe.get_doc(card_data).insert(ignore_permissions=True)
				frappe.db.commit()



		# Đổi thương hiệu ứng dụng hệ thống sang Bfarm và dùng logo mới
		try:
			frappe.db.set_single_value("Website Settings", "app_name", "Bfarm")
			frappe.db.set_single_value("Website Settings", "app_logo", "/assets/bfarm/images/logo.png")
			frappe.db.set_single_value("Website Settings", "favicon", "/assets/bfarm/images/logo.png")
			frappe.db.set_single_value("Website Settings", "splash_image", "/assets/bfarm/images/logo.png")
			frappe.db.set_single_value("Website Settings", "banner_html", '<img src="/assets/bfarm/images/logo.png" style="height: 28px;"> Bfarm')
			frappe.db.set_single_value("Website Settings", "language", "vi")
			frappe.db.set_single_value("System Settings", "app_name", "Bfarm")
			frappe.db.set_single_value("System Settings", "language", "vi")
			frappe.db.set_single_value("System Settings", "default_app", "bfarm")
			frappe.db.set_single_value("Navbar Settings", "app_logo", "/assets/bfarm/images/logo.png")
			frappe.db.sql("""UPDATE `tabUser` SET default_app = 'bfarm' WHERE user_type = 'System User'""")
			frappe.db.commit()
		except Exception:
			pass

		# Thêm bản dịch Tiếng Việt trực tiếp vào Database (tabTranslation)
		try:
			translations = [
				("Sign In", "Đăng nhập"),
				("Welcome! Please sign in to continue.", "Chào mừng bạn! Vui lòng đăng nhập để tiếp tục."),
				("Email", "Email"),
				("Password", "Mật khẩu"),
				("Forgot password?", "Quên mật khẩu?"),
				("Continue", "Đăng nhập"),
				("Login with Email Link", "Đăng nhập bằng liên kết Email"),
				("Don't have an account?", "Chưa có tài khoản?"),
				("Sign up", "Đăng ký"),
				("Email is required.", "Vui lòng nhập Email."),
				("Password is required.", "Vui lòng nhập Mật khẩu."),
				("Send Link", "Gửi liên kết"),
				("Send login link", "Gửi liên kết đăng nhập"),
			]
			for source, target in translations:
				if not frappe.db.exists("Translation", {"language": "vi", "source_text": source}):
					doc = frappe.get_doc({
						"doctype": "Translation",
						"language": "vi",
						"source_text": source,
						"translated_text": target
					})
					doc.insert(ignore_permissions=True)
				else:
					frappe.db.set_value("Translation", {"language": "vi", "source_text": source}, "translated_text", target)
			frappe.db.commit()
		except Exception:
			pass

		# Xóa các bản copy cá nhân tùy chỉnh (User Workspace) nếu người dùng từng Edit khiến Workspace bị khóa/cũ
		try:
			frappe.db.sql("""DELETE FROM `tabWorkspace` WHERE (title = %s OR label = %s OR name LIKE %s) AND (public = 0 OR (for_user IS NOT NULL AND for_user != ''))""", ("Bfarm Agriculture", "Bfarm Agriculture", "%Bfarm Agriculture%"))
			frappe.db.sql("""DELETE FROM `tabUser Settings` WHERE `data` LIKE %s""", ("%Bfarm Agriculture%",))
			frappe.db.commit()
		except Exception:
			pass

		# Ép restrict_to_domain = NULL, is_hidden = 0, public = 1 cho MỌI bản ghi workspace liên quan
		try:
			frappe.db.sql(
				"UPDATE `tabWorkspace` SET restrict_to_domain = NULL, is_hidden = 0, public = 1, for_user = NULL WHERE name LIKE '%Bfarm Agriculture%' OR title LIKE '%Bfarm Agriculture%'"
			)
			frappe.db.commit()
		except Exception:
			pass

		# Kiểm tra xem Workspace đã tồn tại chưa
		if not frappe.db.exists("Workspace", name):
			doc = frappe.get_doc(data)
			doc.app = data.get("app") or "erpnext"
			doc.public = 1
			doc.for_user = ""
			# NULL để lọt filter "restrict_to_domain IN (NULL, active_domains)"
			# trong frappe/desk/desktop.py get_workspaces (chuỗi "" KHÔNG khớp NULL -> workspace bị lọc -> route not found)
			doc.restrict_to_domain = None
			doc.insert(ignore_permissions=True)
			frappe.db.commit()
		else:
			doc = frappe.get_doc("Workspace", name)
			doc.app = data.get("app") or "erpnext"
			doc.public = 1
			doc.for_user = ""
			doc.is_hidden = 0
			doc.content = data.get("content")
			doc.charts = []
			for chart in data.get("charts", []):
				doc.append("charts", chart)
			doc.number_cards = []
			for card in data.get("number_cards", []):
				doc.append("number_cards", card)
			doc.links = []
			for link in data.get("links", []):
				doc.append("links", link)
			doc.sequence_id = data.get("sequence_id", -100.0)
			doc.icon = data.get("icon", "agriculture")
			doc.title = data.get("title")
			# Bắt buộc NULL (không phải "") để workspace luôn lọt filter get_workspaces
			# ("restrict_to_domain IN [None, active_domains]" — "" không khớp NULL -> bị lọc -> route not found)
			doc.restrict_to_domain = None
			doc.sidebar_items = []
			for sb in data.get("sidebar_items", []):
				doc.append("sidebar_items", sb)
			doc.save(ignore_permissions=True)
			frappe.db.commit()

		# Ẩn Workspace Home mặc định của ERPNext để Bfarm Agriculture ghi đè thay thế làm Home chính
		if frappe.db.exists("Workspace", "Home"):
			frappe.db.set_value("Workspace", "Home", "is_hidden", 1)
			frappe.db.commit()

		# Xóa cache server để áp dụng ngay
		frappe.clear_cache()

