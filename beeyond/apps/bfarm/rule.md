# Quy tắc và Hướng dẫn Tùy biến Dự án Bfarm (rule.md)

> **Cảnh báo**: Tài liệu này chứa phân tích lỗi thực tế và các quy tắc BẮT BUỘC.
> Mọi lập trình viên tùy biến app `bfarm` phải đọc kỹ trước khi code.

---

## 1. PHÂN TÍCH LỖI: Tại sao Custom UI (JS/CSS) không hoạt động mà chỉ Translate chạy?

### 1.1. Nguyên nhân gốc rễ #1 — `frappe.ready()` KHÔNG tồn tại trên Desk

**Đây là lỗi nghiêm trọng nhất.**

Toàn bộ code JS custom trong [bfarm.js](bfarm/public/js/bfarm.js) được bọc trong:
```javascript
frappe.ready(function() {
    // ...toàn bộ code navbar, redirect, map override...
});
```

**Vấn đề**: Hàm `frappe.ready()` chỉ được định nghĩa trong template **Website** (`frappe/templates/base.html`, dòng 49):
```javascript
frappe.ready = function(fn) {
    frappe.ready_events.push(fn);
}
```

Trên **Desk** (`frappe/www/desk.html`), hàm `frappe.ready` **KHÔNG BAO GIỜ được định nghĩa**.
Khi trình duyệt thực thi `frappe.ready(function() {...})` trên Desk, nó gọi `undefined(function(){...})` → **TypeError bị nuốt lặng lẽ** → toàn bộ code bên trong bị bỏ qua.

**Giải pháp đã áp dụng**: Thay `frappe.ready(function() {...})` bằng `$(document).ready(function() {...})`.
jQuery `$(document).ready()` hoạt động đúng trên **cả Desk lẫn Website**.

### 1.2. Nguyên nhân gốc rễ #2 — Thiếu symlink/folder `bfarm` trong `sites/assets/`

Khi kiểm tra thư mục `sites/assets/`, chỉ thấy:
```
sites/assets/
├── frappe       (symlink)
├── erpnext      (symlink)
├── assets.json
├── css/
├── js/
└── locale/
```

**Không có thư mục `bfarm`** → khi trình duyệt tải `/assets/bfarm/js/bfarm.js` và `/assets/bfarm/css/bfarm.css` → **lỗi HTTP 404**.

**Nguyên nhân**: Chưa chạy lệnh `bench build --app bfarm` để Frappe:
1. Tạo symlink `sites/assets/bfarm → apps/bfarm/bfarm/public`
2. Đăng ký file tĩnh vào `assets.json`

### 1.3. Nguyên nhân gốc rễ #3 — `assets.json` không chứa entry nào của bfarm

File `sites/assets/assets.json` chỉ chứa bundle của `frappe` và `erpnext`.
Không có bất kỳ đường dẫn nào trỏ tới `bfarm`.

### 1.4. Tại sao Translation (vi.csv) vẫn hoạt động?

Translation trong Frappe hoạt động qua **cơ chế hoàn toàn khác**:
- Frappe tải bản dịch từ database/file CSV bằng API `frappe.translate.get_boot_translations`
- Quá trình này **không phụ thuộc** vào `assets.json`, symlink, hay `frappe.ready()`
- Chỉ cần app `bfarm` được cài đặt vào site (`installed_apps` trong `site_config.json` chứa `"bfarm"`) → Frappe tự quét file `bfarm/translations/vi.csv` và nạp bản dịch

---

## 2. CẤU TRÚC DỰ ÁN

### 2.1. Tổng quan Kiến trúc

```
BfarmMobileApp (Android/Kotlin) ──HTTPS──► BfarmWeb (Frappe Bench)
                                              │
                                              ├── apps/frappe/      ← Core Framework (KHÔNG ĐƯỢC SỬA)
                                              ├── apps/erpnext/     ← Core ERP (KHÔNG ĐƯỢC SỬA)
                                              ├── apps/agriculture/ ← App nông nghiệp (HẠN CHẾ SỬA)
                                              └── apps/bfarm/       ← App tùy biến Bfarm (NƠI DUY NHẤT VIẾT CODE)
```

### 2.2. Cấu trúc chi tiết App `bfarm`

```
apps/bfarm/
├── bfarm/
│   ├── __init__.py
│   ├── hooks.py                          ← Điểm vào: khai báo CSS/JS/hooks
│   ├── modules.txt                       ← Danh sách module
│   ├── setup.py                          ← Hàm after_migrate (sync workspaces)
│   ├── public/
│   │   ├── js/bfarm.js                   ← JavaScript tùy biến cho Desk
│   │   └── css/bfarm.css                 ← CSS tùy biến cho Desk
│   ├── translations/
│   │   └── vi.csv                        ← Bản dịch tiếng Việt
│   └── bfarm/
│       ├── workspace/bfarm_agriculture/  ← Workspace JSON
│       └── www/index.py                  ← Redirect trang gốc
└── rule.md                               ← (file này)
```

### 2.3. App `agriculture` — Nghiệp vụ nông nghiệp

- Cung cấp ~20 DocTypes: `Crop`, `Crop Cycle`, `Disease`, `Fertilizer`, `Weather`, `Soil Analysis`, `Water Analysis`, `Plant Analysis`...
- Xác thực đăng nhập theo role (`on_login → validate_login_role` trong `auth.py`)
- Tạo dữ liệu mặc định sau cài đặt (~90 tiêu chí phân tích trong `setup.py`)
- Cấp quyền `Custom DocPerm` trên `Location` cho role Agriculture

---

## 3. QUY TẮC BẮT BUỘC KHI TÙY BIẾN

### Quy tắc 1 — KHÔNG sử dụng `frappe.ready()` cho code chạy trên Desk

```javascript
// ❌ SAI — frappe.ready() chỉ tồn tại trên Website, KHÔNG có trên Desk
frappe.ready(function() {
    // Code này sẽ KHÔNG BAO GIỜ chạy trên Desk
});

// ✅ ĐÚNG — $(document).ready() hoạt động trên cả Desk và Website
$(document).ready(function() {
    // Code này chạy đúng trên mọi ngữ cảnh
});
```

### Quy tắc 2 — KHÔNG chỉnh sửa mã nguồn Core

| Thư mục | Được phép sửa? | Lý do |
|---------|---------------|-------|
| `apps/frappe/` | ❌ TUYỆT ĐỐI KHÔNG | Core framework, sẽ mất khi cập nhật |
| `apps/erpnext/` | ❌ TUYỆT ĐỐI KHÔNG | Core ERP, sẽ mất khi cập nhật |
| `apps/agriculture/` | ⚠️ HẠN CHẾ | App nghiệp vụ nền, chỉ sửa khi thật cần thiết |
| `apps/bfarm/` | ✅ NƠI DUY NHẤT | Mọi tùy biến phải nằm ở đây |

### Quy tắc 3 — Cách ghi đè Class đúng chuẩn Frappe

Khi ghi đè Class của Frappe (như `ControlGeolocation`, `MapView`), **bắt buộc** dùng kế thừa ES6:

```javascript
// ❌ SAI — Monkey-patching prototype trực tiếp, dễ mất method gốc
frappe.ui.form.ControlGeolocation.prototype.bind_leaflet_map = function() { ... };

// ✅ ĐÚNG — Kế thừa Class gốc, giữ nguyên mọi method không bị ghi đè
const OriginalClass = frappe.ui.form.ControlGeolocation;
frappe.ui.form.ControlGeolocation = class extends OriginalClass {
    bind_leaflet_map() {
        // Code ghi đè ở đây
        // Có thể gọi super.bind_leaflet_map() nếu cần logic gốc
    }
    // Các method khác (make_map, bind_leaflet_data...) được kế thừa tự động
};
```

### Quy tắc 4 — Quy trình bắt buộc sau mỗi lần thay đổi CSS/JS

**Sau mỗi lần sửa file trong `bfarm/public/`**, phải chạy:

```bash
# Bước 1: Tạo symlink và biên dịch assets
bench build --app bfarm

# Bước 2: Xóa cache server
bench clear-cache

# Bước 3: Xóa cache trình duyệt (Ctrl+F5 hoặc Cmd+Shift+R)
```

**Nếu đang phát triển**, dùng `bench watch` để tự động build khi file thay đổi:
```bash
bench watch
```

> **Lưu ý quan trọng**: Nếu bỏ qua bước `bench build`, file JS/CSS sẽ **không tồn tại** 
> tại đường dẫn `/assets/bfarm/...` → lỗi 404 → mọi tùy biến giao diện sẽ không hoạt động.

### Quy tắc 5 — Cách khai báo assets trong hooks.py

```python
# ✅ Cách 1: Đường dẫn tĩnh trực tiếp (app nhỏ, không cần bundler)
app_include_css = "/assets/bfarm/css/bfarm.css"
app_include_js = "/assets/bfarm/js/bfarm.js"

# ✅ Cách 2: Dùng Frappe bundler (app lớn, khuyến nghị cho dự án phát triển lâu dài)
# Tạo file: bfarm/public/js/bfarm.bundle.js
# Khai báo:
# app_include_js = "bfarm.bundle.js"
```

### Quy tắc 6 — Quản lý bản dịch

- **KHÔNG** hardcode tiếng Việt vào JS, HTML hay Python
- Luôn bọc chuỗi bằng hàm dịch: `__("English text")` trong JS, `_("English text")` trong Python
- Khai báo bản dịch trong file tập trung: `bfarm/translations/vi.csv`

### Quy tắc 7 — Kiểm tra trước khi commit

Trước khi commit code, lập trình viên phải:
1. Kiểm tra cú pháp JS: `node -c bfarm/public/js/bfarm.js`
2. Kiểm tra cú pháp Python: `python -m py_compile <file.py>`
3. Chạy `bench build --app bfarm` trên server và xác nhận không có lỗi
4. Mở trình duyệt → F12 Console → kiểm tra không có lỗi 404 hoặc TypeError liên quan đến bfarm

### Quy tắc 8 — Cấu hình Điều hướng Trang chủ Mặc định (`bfarm-agriculture`)

Cơ chế BẮT BUỘC (đã xác minh 2026-08-19) — làm theo đúng thứ tự, KHÔNG dùng boot override:

1. **Redirect sau đăng nhập**: Khai báo `role_home_page = {"System Manager": "/app/bfarm-agriculture", "Administrator": "...", "Agriculture User": "...", "All": "/app/bfarm-agriculture"}` trong `hooks.py`.
   - `auth.py::set_user_info` (dòng 211) gọi `get_home_page()` → `get_home_page_via_hooks()` (frappe/website/utils.py:156-161) lấy giá trị theo role rồi `.strip("/")` → trả `"app/bfarm-agriculture"`.
   - Login page dùng core `templates/includes/login/login.js::handler 200` (dòng 325): `window.location.href = ... || data.home_page` → điều hướng trực tiếp về `/app/bfarm-agriculture`.
   - **CẢNH BÁO**: `bootinfo.default_route` / `default_path` / `user.default_route` do `boot_session` ghi vào là **VÔ DỤNG** — frontend Desk không đọc bất kỳ field nào trong số đó. Đã xóa khỏi `boot.py`. Nếu user set `default_workspace` trong hồ sơ, `get_home_page()` (utils.py:133-136) ưu tiên nó và trả `/app/<slug>`.
2. **Workspace phải tồn tại trong boot**: `restrict_to_domain` của workspace `bfarm_agriculture.json` phải là `null` (**NULL** trong DB — KHÔNG phải chuỗi rỗng `""`). Cả hai trường hợp `"Agriculture"` (Domain chưa active) lẫn `""` (chuỗi rỗng) đều khiến `frappe/desk/desktop.py::get_workspaces` (dòng 449-459) lọc workspace khỏi `frappe.boot.workspaces` với user thường, vì nó filter `"restrict_to_domain": ["in", [None, *frappe.get_active_domains()]]` — `""` KHÔNG khớp `None`. Hậu quả: `/app/bfarm-agriculture` báo "web not found". `setup.py::sync_workspaces` ép `doc.restrict_to_domain = None` cho bản ghi DB có sẵn + chạy SQL repair `UPDATE \`tabWorkspace\` SET restrict_to_domain = NULL`.
3. **Frontend fallback (`bfarm.js`)**: bắt sự kiện Router + `app_ready` để chuyển route về `bfarm-agriculture` — chỉ là lớp phụ trợ, không được phụ thuộc vào nó (asset có thể 404 nếu chưa build).
4. **Đừng cố dùng `extend_bootinfo`**: hook chạy ở `frappe/sessions.py` dòng 169 TRƯỚC khi `bootinfo["apps_data"]` được tạo (dòng 176-180) nên luôn `False`; kể cả khi ghi được, client cũng không đọc `apps_data.default_path`. Đã xóa.
5. Sau khi deploy change: chạy `bench migrate` (để `sync_workspaces` ép lại restrict_to_domain) + `bench clear-cache` (xóa cache `home_page:{user}` nếu từng cache `"desk"`).

### Quy tắc 9 — Luồng Login & "Lag / không vào được ở một số trình duyệt" (đã xác minh 2026-08-19)

Chuỗi xử lý khi submit form login:
1. `login.js::bind_events` → POST `/api/method/login`.
2. Server `frappe/auth.py::LoginManager.login` → `frappe.clear_cache(user=usr)` (xóa cache user, buộc rebuild boot) → `authenticate` → `post_login`.
3. `post_login`: `run_trigger("on_login")` (frappe `_get_unseen_notes` + agriculture `validate_login_role` + bfarm `bfarm.bfarm.auth.on_login`) → `make_session` (ghi tabSessions) → `setup_boot_cache` → `set_user_info` → **`get_home_page()`** → ghi `frappe.local.response["home_page"]`.
4. `login.js` handler 200 (dòng 325): `window.location.href = sanitise_redirect(get_url_arg("redirect-to")) || data.home_page;` rồi full-page load `/app/bfarm-agriculture`.

**Các lỗi thực tế đã sửa (chỉ trong app bfarm):**
- **Redirect sau login dùng sai tiền tố /desk/**: Tiền tố `/desk/` không phải đường dẫn chuẩn của Frappe Desk (Desk dùng `/app/`). Khi dùng `/desk/bfarm-agriculture`, Frappe router bị xung đột và rơi vào vòng lặp tải trang vĩnh viễn (stuck loading). Fix: đổi toàn bộ home_page và redirect về `/app/bfarm-agriculture` tuyệt đối trong `hooks.py`, `auth.py`, `index.py`, và `bfarm.js`.
- **Treo request đăng nhập do gọi boot info đồng bộ trong on_session_creation**: Gọi `frappe.sessions.get()` trong `on_session_creation` khi session chưa commit làm nghẽn thread đăng nhập. Fix: bỏ `frappe.sessions.get()` khỏi `on_session_creation`.
- **"Web not found" sau login (không vào được workspace)**: `restrict_to_domain` của workspace phải **NULL** (`None`), KHÔNG phải `""` — rule.md quy tắc 8; `frappe/desk/desktop.py::get_workspaces` filter `IN [None, active_domains]` nên `""` khiến workspace bị loại khỏi boot với user thường. Fix: `bench --site bfarm execute bfarm.bfarm.setup.sync_workspaces` (hoặc SQL `UPDATE tabWorkspace SET restrict_to_domain = NULL WHERE name = 'Bfarm Agriculture'`). Đã xác minh code 2026-08-19: JSON `null` + setup.py `None` + SQL repair.
- **Assets 404**: chưa chạy `bench build --app bfarm` → `/assets/bfarm/js/bfarm.js` 404 → các override điều hướng client-side (xóa `session_last_route`, chặn desktop icons) không chạy.

**Lưu ý KHÔNG được làm:**
- KHÔNG dùng `boot_session`/`extend_bootinfo` để ghi `default_route`/`default_path` — frontend không đọc (đã xóa).
- KHÔNG chỉnh core `frappe/auth.py`, `sessions.py`, `login.js` — thay đổi route chỉ qua `bfarm/bfarm/auth.py::on_login` + `role_home_page`.
- KHÔNG xóa logic clear `session_last_route`/`frappe_last_route` trong `login.html` head — nó chống việc Desk restore về màn desktop-icons cũ (đặc biệt khi bfarm.js chưa build).
- KHÔNG bật lại `setInterval` vô hạn trong login.html — interval phải tự dừng khi form login biến mất.

---

## 4. BẢNG TÓM TẮT LỖI & GIẢI PHÁP

| # | Lỗi | Nguyên nhân | Giải pháp | File bị ảnh hưởng |
|---|-----|-------------|-----------|-------------------|
| 1 | Code JS custom không chạy trên Desk | Dùng `frappe.ready()` — hàm này chỉ tồn tại trên Website, không tồn tại trên Desk | Thay bằng `$(document).ready()` | `bfarm/public/js/bfarm.js` |
| 2 | CSS/JS bị lỗi 404 | Chưa chạy `bench build` → thiếu symlink `sites/assets/bfarm` | Chạy `bench build --app bfarm` | `sites/assets/` |
| 3 | Bundle không được đăng ký | `assets.json` không chứa entry của bfarm | Chạy `bench build --app bfarm` | `sites/assets/assets.json` |
| 4 | Translation vẫn chạy | Translation dùng cơ chế riêng (API + CSV), không phụ thuộc assets | Không cần sửa | — |
| 5 | Bấm logo nhảy về Home cũ | Route mặc định của Frappe là `home` | Dùng `boot_session` hook + Router Interceptor trong `bfarm.js` | `boot.py`, `hooks.py`, `bfarm.js` |

