# 🚀 Autofill Trợ Cấp Thất Nghiệp (cthung-snvquangngai)

**Phiên bản:** 1.0  
**Tác giả / Credit:** Cao Tiến Hưng - Sở Nội Vụ Quảng Ngãi  

Extension Chrome/Edge được thiết kế chuyên biệt để tự động hóa quá trình nhập liệu hồ sơ Trợ Cấp Thất Nghiệp trên Cổng Dịch vụ công. Công cụ giúp trích xuất dữ liệu từ văn bản thô (thông tin người dùng copy) và tự động điền vào các trường (field) phức tạp trên web, bao gồm cả các dropdown có tìm kiếm (Choices.js) và các form chia tab (Form Cán bộ).

---

## 📑 Bảng mô tả tính năng
* **Phân tách luồng thông minh:** Hỗ trợ xử lý độc lập giữa Form Công dân (1 trang) và Form Cán bộ (đa tab).
* **Smart Dropdown Matcher:** Tự động mô phỏng thao tác gõ phím để kích hoạt bộ lọc của web, xử lý mượt mà các dropdown dài như "Ngành nghề" hay "Nơi khám chữa bệnh".
* **Trigger Event Native:** Vượt qua các rào cản của framework web hiện đại (như React/Formio) bằng cách bắn các sự kiện `input`, `change`, `blur` chuẩn xác.
* **Tự động chuẩn hóa dữ liệu:** Tự động định dạng ngày tháng (DD/MM/YYYY), viết hoa chữ cái đầu cho Phường/Xã/Tỉnh và bóc tách tên Ngân hàng.

---

## ⚙️ Kiến trúc & Cách thức hoạt động

Extension hoạt động dựa trên cơ chế giao tiếp giữa **Popup** (Giao diện người dùng trên thanh công cụ) và **Content Script** (Mã chạy ngầm trên trang web Dịch vụ công).

### 1. Phân tích dữ liệu (Parser) - `popup.js`
Khi người dùng dán dữ liệu vào Textarea và bấm nút, `popup.js` sẽ kích hoạt hàm `getParsedData()`. Hàm này biến đoạn text thô thành một Object JSON có cấu trúc.

```javascript
// Trích xuất từ popup.js
const getParsedData = (textAreaId) => {
  // Cắt dòng và loại bỏ dòng trống
  const lines = document.getElementById(textAreaId).value.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Hàm lấy giá trị dựa trên Label (Dòng ngay dưới Label)
  const getVal = key => lines[lines.findIndex(l => l.toUpperCase() === key.toUpperCase()) + 1] || '';
  
  // Định dạng lại ngày tháng
  const formatDate = str => str ? str.split('/').map((p, i) => i < 2 ? p.padStart(2, '0') : p).join('/') : '';
  
  return {
    fullname: getVal('HỌ VÀ TÊN'),
    birthday: formatDate(getVal('NĂM SINH')),
    // ... bóc tách các trường khác
  };
};

```

Sau khi dữ liệu được parse thành công, `chrome.tabs.sendMessage` sẽ gửi gói dữ liệu này cùng với `mode` (citizen hoặc officer) sang `content.js`.

### 2. Mô phỏng thao tác nhập liệu - `content.js`

Framework của trang web Dịch vụ công không cho phép gán giá trị đơn giản bằng `input.value = "text"`. Nó yêu cầu phải có sự kiện của người dùng. `content.js` giải quyết bằng cách sử dụng `Native Setter` và `dispatchEvent`.

```javascript
// Trích xuất từ content.js - Hàm setInput
const triggerEvents = (el, val) => {
  // Lấy Native Setter để ép ghi đè giá trị xuyên qua lớp bảo vệ của framework
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  if (setter) setter.call(el, val); else el.value = val;
  
  // Bắn liên hoàn 3 sự kiện để web nhận diện đã có tương tác
  ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
};

```

Đồng thời, extension sử dụng cơ chế **Mảng từ khóa (Array)** để linh hoạt tìm kiếm thẻ Input. Ví dụ: `setInput(['fullname', 'Họ và tên chủ hồ sơ'], data.fullname);` (Tự động thích ứng dù tên trường của Công dân và Cán bộ có khác nhau).

### 3. Xử lý Dropdown phức tạp (Choices.js)

Đây là phần lõi sức mạnh của tool. Các dropdown ngành nghề quá dài sẽ khiến web bị "đơ" nếu gõ nguyên chuỗi. Do đó tool có logic tách biệt:

* **Ngành/Nghề:** Chỉ dùng tối đa 15 ký tự đầu để mồi nhử tìm kiếm.
* **Bệnh viện/Tỉnh:** Dùng 100 ký tự (toàn bộ chuỗi) để đảm bảo chính xác.

```javascript
// Logic giới hạn ký tự thông minh
const isIndustry = matchedKey.match(/Industry|Occupation|Ngành|Nghề/i);
const keyword = value.substring(0, isIndustry ? 15 : 100);

// Giả lập gõ phím Enter nếu không thể click
if (match) {
    ['mousedown', 'mouseup', 'click'].forEach(e => match.dispatchEvent(new MouseEvent(e, { bubbles: true })));
} else {
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
}

```

---

## 🔄 Phân biệt luồng: Cán Bộ (Officer) vs Công Dân (Citizen)

Do cấu trúc giao diện của 2 nhóm đối tượng này khác nhau, Extension sử dụng biến `mode` để chia luồng xử lý ở cuối file `content.js`.

### 👨‍💼 Luồng Công Dân (Citizen Mode)

Form của Công dân hiển thị toàn bộ trên **một trang duy nhất**.
Hệ thống chỉ cần chạy tuần tự từ trên xuống dưới mà không cần chờ đợi load DOM.

```javascript
if (mode === 'citizen') {
    await fillThongTinChung();     // Điền block đầu
    await fillThongTinChiTiet();   // Điền block cuối
}

```

### 👮 Luồng Cán Bộ (Officer Mode)

Form của Cán bộ được thiết kế dạng **Tabs (Thẻ chuyển đổi)**. Trang web yêu cầu click vào từng Tab, đợi dữ liệu tải bằng AJAX rồi mới được điền.
Tool giải quyết bằng hàm `switchTab` kết hợp `Delay`.

```javascript
// Hàm chuyển tab tự động
const switchTab = async (tabName) => {
    // Tìm thẻ có chứa tên tab
    const el = Array.from(document.querySelectorAll('a, div, span, li')).find(e => e.textContent.trim() === tabName);
    if (el) {
        (el.closest('a') || el.closest('li') || el).click(); // Click chuyển tab
        await delay(800); // CHỜ 0.8s CHO AJAX TẢI XONG FORM
    }
};

// Luồng thực thi của Cán bộ
if (mode === 'officer') {
    await switchTab('Thông tin chung'); 
    await fillThongTinChung(); // Điền xong tab 1
    
    await switchTab('Thông tin chi tiết'); 
    await fillThongTinChiTiet(); // Tự nhảy sang tab chi tiết và điền nốt
}

```

---

## 🛠 Hướng dẫn cài đặt & Sử dụng

1. Giải nén thư mục chứa Extension.
2. Mở trình duyệt Chrome/Edge, truy cập vào trang Quản lý tiện ích: `chrome://extensions/`
3. Bật chế độ **Developer mode** (Chế độ dành cho nhà phát triển).
4. Chọn **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục code.
5. Mở trang Dịch vụ công, bấm vào icon của Extension, chọn Tab Công Dân hoặc Cán Bộ tương ứng.
6. Dán dữ liệu hồ sơ vào ô trống và bấm **Bắt đầu điền Form**. Chờ thông báo nổi xuất hiện là hoàn tất!

```

```
