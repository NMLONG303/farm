$(document).ready(function() {
    // Ghi đè phương thức get_display_title của SidebarHeader để đổi chữ ERPNext thành Bfarm
    let override_sidebar_header = function() {
        if (frappe.ui && frappe.ui.SidebarHeader && !frappe.ui.SidebarHeader.prototype._bfarm_title_overridden) {
            const OriginalSidebarHeader = frappe.ui.SidebarHeader;
            frappe.ui.SidebarHeader = class SidebarHeader extends OriginalSidebarHeader {
                get_display_title() {
                    let title = super.get_display_title();
                    if (title === "ERPNext" || title === "Frappe" || !title) {
                        return "Bfarm";
                    }
                    return title;
                }
            };
            frappe.ui.SidebarHeader.prototype._bfarm_title_overridden = true;
            console.log("[Bfarm Sidebar Override] SidebarHeader get_display_title successfully overridden.");
        }

        // DOM helper cập nhật trực tiếp tiêu đề sidebar header
        $(".sidebar-header .header-title, .body-sidebar .header-title, #sidebar_tab .header-title").each(function() {
            let txt = $(this).text().trim();
            if (txt === "ERPNext" || txt === "Frappe") {
                $(this).text("Bfarm");
            }
        });
    };

    // Ghi đè phương thức render_logo của WorkspaceDock để hiển thị logo.png thay thế cho logo ERPNext ở góc trên bên trái thanh Dock Rail
    let override_workspace_dock_logo = function() {
        if (frappe.ui && frappe.ui.WorkspaceDock && !frappe.ui.WorkspaceDock.prototype._bfarm_logo_overridden) {
            const OriginalWorkspaceDock = frappe.ui.WorkspaceDock;
            frappe.ui.WorkspaceDock = class WorkspaceDock extends OriginalWorkspaceDock {
                render_logo() {
                    let logo_url = "/assets/bfarm/images/logo.png";
                    let title = "Bfarm Agriculture";

                    if (this.$logo) {
                        this.$logo.empty();
                        let $link = $(
                            `<a href="/desk/bfarm-agriculture" title="${frappe.utils.escape_html(title)}" aria-label="Bfarm" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                <img src="${logo_url}" alt="Bfarm Logo" style="max-height: 28px; width: auto; object-fit: contain;" />
                            </a>`
                        );
                        $link.on("click", (e) => {
                            e.preventDefault();
                            frappe.set_route("bfarm-agriculture");
                        });
                        this.$logo.append($link);
                    }
                }
            };
            frappe.ui.WorkspaceDock.prototype._bfarm_logo_overridden = true;
            console.log("[Bfarm Dock Override] WorkspaceDock render_logo successfully overridden with Bfarm logo.");
        }
    };

    // Xóa logo/chữ dư thừa ở header navbar để giữ header gọn gàng
    let clean_header_navbar = function() {
        let brand = $(".navbar-brand");
        if (brand.length) {
            brand.empty();
        }
        $(".navbar .app-logo, .navbar-brand .app-logo").attr("src", "/assets/bfarm/images/logo.png");
    };

    // Tự động thay đổi logo và ép bản dịch tiếng Việt trực tiếp cho trang Đăng nhập (/login)
    let override_login_page = function() {
        if ($(".login-content").length || window.location.pathname.indexOf("login") !== -1) {
            $(".login-content .app-logo, img.app-logo").attr("src", "/assets/bfarm/images/logo.png");

            let tr = {
                "Sign In": "Đăng nhập",
                "Welcome! Please sign in to continue.": "Chào mừng bạn! Vui lòng đăng nhập để tiếp tục.",
                "Email": "Email",
                "Password": "Mật khẩu",
                "Forgot password?": "Quên mật khẩu?",
                "Continue": "Đăng nhập",
                "Login with Email Link": "Đăng nhập bằng liên kết Email",
                "Don't have an account?": "Chưa có tài khoản?",
                "Sign up": "Đăng ký",
                "Back to sign in": "Quay lại đăng nhập",
                "Send Link": "Gửi liên kết",
                "Send login link": "Gửi liên kết đăng nhập",
                "Sign Up": "Đăng ký tài khoản",
                "Forgot Password?": "Quên mật khẩu?",
                "Please enter your email, we'll send you password reset link": "Vui lòng nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu cho bạn."
            };

            $(".login-content h4, .login-content p, .login-content label, .login-content button, .login-content a, .es-button").each(function() {
                let $el = $(this);
                let txt = $el.text().trim();
                if (tr[txt]) {
                    $el.text(tr[txt]);
                }
            });
        }
    };

    if (window.location.pathname.indexOf("login") !== -1) {
        setInterval(override_login_page, 200);
    }

    $(document).on("toolbar_setup page-change", function() {
        clean_header_navbar();
        override_workspace_dock_logo();
        override_sidebar_header();
        override_login_page();
    });
    setTimeout(clean_header_navbar, 300);
    setTimeout(override_workspace_dock_logo, 300);
    setTimeout(override_sidebar_header, 300);
    setTimeout(override_sidebar_header, 1000);
    setTimeout(override_login_page, 300);
    override_sidebar_header();
    override_login_page();

    // Xóa session_last_route cũ nếu nó trỏ về desktop/apps để tránh Frappe restore route cũ khi đăng nhập
    if (typeof localStorage !== "undefined" && frappe.session && frappe.session.user && frappe.session.user !== "Guest") {
        let last_route = localStorage.getItem("session_last_route");
        if (last_route && (last_route.indexOf("desktop") !== -1 || last_route.indexOf("apps") !== -1 || last_route === "desk")) {
            localStorage.removeItem("session_last_route");
        }
    }

    // Đảm bảo frappe.workspaces luôn ánh xạ đúng các workspace thật từ frappe.boot.workspaces.pages
    let sync_workspaces_from_boot = function() {
        if (typeof frappe !== "undefined" && frappe.boot && frappe.boot.workspaces && frappe.boot.workspaces.pages) {
            if (!frappe.workspaces) frappe.workspaces = {};
            frappe.boot.workspaces.pages.forEach(function(page) {
                if (page && page.name) {
                    let slug = page.name.toLowerCase().replace(/ /g, "-");
                    frappe.workspaces[slug] = page;
                    frappe.workspaces[page.name] = page;
                }
            });
        }
    };
    sync_workspaces_from_boot();
    $(document).on("app_ready page-change toolbar_setup", sync_workspaces_from_boot);

    // ==========================================
    // Custom Geolocation Map Zoom (Override)
    // ==========================================
    let override_geolocation_map = function() {
        // Ghi đè cấu hình map mặc định của Frappe
        if (frappe.utils && frappe.utils.map_defaults) {
            // Đặt độ zoom mặc định ban đầu là 18 (sâu hơn 13)
            frappe.utils.map_defaults.zoom = 18;

            let tiles = frappe.utils.map_defaults.tiles;
            if (tiles.default_tile && tiles.default_tile.options) {
                tiles.default_tile.options.maxZoom = 23;
                tiles.default_tile.options.maxNativeZoom = 19;
            }
            if (tiles.satellite_tile && tiles.satellite_tile.options) {
                tiles.satellite_tile.options.maxZoom = 23;
                tiles.satellite_tile.options.maxNativeZoom = 19;
            }
            if (tiles.labels_tail && tiles.labels_tail.options) {
                tiles.labels_tail.options.maxZoom = 23;
                tiles.labels_tail.options.maxNativeZoom = 19;
            }
            if (tiles.terrain_lines_tail && tiles.terrain_lines_tail.options) {
                tiles.terrain_lines_tail.options.maxZoom = 23;
                tiles.terrain_lines_tail.options.maxNativeZoom = 19;
            }
        }

        // Ghi đè class ControlGeolocation (Sử dụng trong form View)
        if (typeof frappe !== "undefined" && frappe.ui && frappe.ui.form && frappe.ui.form.ControlGeolocation && !frappe.ui.form.ControlGeolocation.prototype._bfarm_overridden) {
            const OriginalControlGeolocation = frappe.ui.form.ControlGeolocation;
            
            frappe.ui.form.ControlGeolocation = class ControlGeolocation extends OriginalControlGeolocation {
                bind_leaflet_map() {
                    // Khởi tạo map với maxZoom là 23
                    this.map = L.map(this.map_id, {
                        maxZoom: 23
                    });
                    
                    this.map.setView(frappe.utils.map_defaults.center, frappe.utils.map_defaults.zoom);

                    this.streetLayer = L.tileLayer(
                        frappe.utils.map_defaults.tiles.default_tile.url,
                        frappe.utils.map_defaults.tiles.default_tile.options
                    );
                    this.satelliteLayer = L.tileLayer(
                        frappe.utils.map_defaults.tiles.satellite_tile.url,
                        frappe.utils.map_defaults.tiles.satellite_tile.options
                    );
                    this.labelsLayer = L.tileLayer(
                        frappe.utils.map_defaults.tiles.labels_tail.url,
                        frappe.utils.map_defaults.tiles.labels_tail.options
                    );
                    this.terrainLayer = L.tileLayer(
                        frappe.utils.map_defaults.tiles.terrain_lines_tail.url,
                        frappe.utils.map_defaults.tiles.terrain_lines_tail.options
                    );

                    this.streetLayer.addTo(this.map);

                    this.editableLayers = new L.FeatureGroup();
                    console.log("[Bfarm Geolocation Override] Leaflet map initialized with maxZoom: 23, maxNativeZoom: 19 (via Class Inheritance)");
                }

                fit_and_recenter_map() {
                    try {
                        this.map.invalidateSize();
                        this.map.fitBounds(this.editableLayers.getBounds(), {
                            padding: [50, 50],
                            maxZoom: 18 // Tránh tự động zoom quá sâu (như 23) làm vỡ/mất ảnh khi có 1 marker
                        });
                    } catch (err) {
                        // bỏ qua lỗi
                    }
                }
            };
            
            frappe.ui.form.ControlGeolocation.prototype._bfarm_overridden = true;
            console.log("[Bfarm Geolocation Override] ControlGeolocation inherited and overridden.");
        }

        // Ghi đè class MapView (Sử dụng trong danh sách List Map View)
        if (typeof frappe !== "undefined" && frappe.views && frappe.views.MapView && !frappe.views.MapView.prototype._bfarm_overridden) {
            const OriginalMapView = frappe.views.MapView;

            frappe.views.MapView = class MapView extends OriginalMapView {
                setup_map() {
                    this.map_id = frappe.dom.get_unique_id();
                    this.$result.html(`<div id="${this.map_id}" class="map-view-container"></div>`);

                    L.Icon.Default.imagePath = frappe.utils.map_defaults.image_path;
                    this.map = L.map(this.map_id, {
                        maxZoom: 23
                    }).setView(
                        frappe.utils.map_defaults.center,
                        frappe.utils.map_defaults.zoom
                    );

                    this.streetLayer = L.tileLayer(
                        frappe.utils.map_defaults.tiles.default_tile.url,
                        frappe.utils.map_defaults.tiles.default_tile.options
                    );
                    this.satelliteLayer = L.tileLayer(
                        frappe.utils.map_defaults.tiles.satellite_tile.url,
                        frappe.utils.map_defaults.tiles.satellite_tile.options
                    );
                    this.labelsLayer = L.tileLayer(
                        frappe.utils.map_defaults.tiles.labels_tail.url,
                        frappe.utils.map_defaults.tiles.labels_tail.options
                    );
                    this.terrainLayer = L.tileLayer(
                        frappe.utils.map_defaults.tiles.terrain_lines_tail.url,
                        frappe.utils.map_defaults.tiles.terrain_lines_tail.options
                    );

                    this.streetLayer.addTo(this.map);

                    this.bind_leaflet_layers_control();
                    this.bind_leaflet_locate_control();
                    L.control.scale().addTo(this.map);
                    if (!this.bound_event_listeners) {
                        this.bind_leaflet_event_listeners();
                    }
                    console.log("[Bfarm MapView Override] MapView setup with maxZoom: 23 (via Class Inheritance)");
                }

                render_map_data(features) {
                    if (this.markerLayer) {
                        this.map.removeLayer(this.markerLayer);
                    }

                    if (features && features.length) {
                        this.markerLayer = L.featureGroup();

                        features.forEach((feature) => {
                            const marker = L.geoJSON(feature).bindPopup(this.get_popup_content(feature));
                            this.markerLayer.addLayer(marker);
                        });

                        this.markerLayer.addTo(this.map);

                        this.map.fitBounds(this.markerLayer.getBounds(), {
                            maxZoom: 18 // Tránh tự động zoom quá sâu làm vỡ/mất ảnh
                        });
                    }
                }
            };

            frappe.views.MapView.prototype._bfarm_overridden = true;
            console.log("[Bfarm Geolocation Override] MapView inherited and overridden.");
        }
    };

    // Theo dõi sự kiện thay đổi trang để áp dụng override
    $(document).on("page-change", function() {
        override_geolocation_map();
    });
    
    // Áp dụng ngay khi ready
    override_geolocation_map();
});
