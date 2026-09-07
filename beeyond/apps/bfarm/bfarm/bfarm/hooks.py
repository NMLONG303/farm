from . import __version__ as app_version

app_name = "bfarm"
app_title = "Bfarm"
app_publisher = "Beeyond"
app_description = "Bfarm Agriculture Customization"
app_icon = "octicon octicon-file-directory"
app_color = "green"
app_email = "contact@beeyond.com"
app_license = "MIT"
app_logo_url = "/assets/bfarm/images/logo.png"
favicon = "/assets/bfarm/images/logo.png"

website_context = {
	"favicon": "/assets/bfarm/images/logo.png",
	"splash_image": "/assets/bfarm/images/logo.png",
	"logo": "/assets/bfarm/images/logo.png"
}

required_apps = ["erpnext", "agriculture"]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/bfarm/css/bfarm.css"
app_include_js = "/assets/bfarm/js/bfarm.js"

# include js, css files in website & login page
web_include_css = "/assets/bfarm/css/bfarm.css"
web_include_js = "/assets/bfarm/js/bfarm.js"
update_website_context = "bfarm.bfarm.boot.update_website_context"

# Session Boot Hook
boot_session = "bfarm.bfarm.boot.boot_session"

# Installation
# ------------
after_migrate = "bfarm.bfarm.setup.sync_workspaces"

# Domains
# -------
domains = {
	"Agriculture": "agriculture",
}
