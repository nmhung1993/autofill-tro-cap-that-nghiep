chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action !== 'fill_form') return;
  const { data, mode } = request;
  const normStr = str => str ? str.trim().toLowerCase() : '';
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Helper kích hoạt event của DOM để website ghi nhận dữ liệu
  const triggerEvents = (el, val) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    if (setter) setter.call(el, val); else el.value = val;
    ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
  };

  // Helper chuyển tab
  const switchTab = async (tabName) => {
    const el = Array.from(document.querySelectorAll('a, div, span, li')).find(e => e.textContent.trim() === tabName);
    if (el) {
      (el.closest('a') || el.closest('li') || el).click();
      await delay(800);
    }
  };

  // Hàm điền Input thường & Datepicker
  const setInput = (keys, value) => {
    if (!value) return;
    keys = Array.isArray(keys) ? keys : [keys];
    let input = keys.map(k => document.querySelector(`input[name="data[${k}]"]`)).find(i => i)
             || Array.from(document.querySelectorAll('label')).find(l => keys.some(k => l.textContent.trim().includes(k)))?.parentElement.querySelector('input');
    
    if (input) {
      input.disabled = false;
      triggerEvents(input, value);
      const visibleInput = input.parentElement.querySelector('input.form-control.input:not([type="hidden"])');
      if (visibleInput) triggerEvents(visibleInput, value);
    }
  };

  // Hàm chọn Dropdown
  const setDropdown = async (keys, value) => {
    if (!value) return;
    keys = Array.isArray(keys) ? keys : [keys];
    
    let container, matchedKey = keys[0];
    for (let k of keys) {
      const sel = document.querySelector(`select[name="data[${k}]"]`);
      if (sel) { container = sel.closest('.choices'); matchedKey = k; break; }
      const lbl = Array.from(document.querySelectorAll('label')).find(l => l.textContent.trim().includes(k));
      if (lbl) { container = lbl.parentElement.querySelector('.choices'); matchedKey = k; break; }
    }
    if (!container) return;

    const isIndustry = matchedKey.match(/Industry|Occupation|Ngành|Nghề/i);
    const keyword = value.substring(0, isIndustry ? 15 : 100);

    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    container.click();
    await delay(300);

    const inp = container.querySelector('.choices__input--cloned') || container.querySelector('input');
    if (inp) {
      inp.focus();
      triggerEvents(inp, keyword);
      await delay(400);

      const opts = Array.from(container.querySelectorAll('.choices__item--choice, [role="option"]'));
      const match = opts.find(o => normStr(o.textContent) === normStr(value)) 
                 || opts.find(o => normStr(o.textContent).includes(normStr(value.substring(0, 15))));
      
      if (match) ['mousedown', 'mouseup', 'click'].forEach(e => match.dispatchEvent(new MouseEvent(e, { bubbles: true })));
      else inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    }
  };

  const fillThongTinChung = async () => {
    setInput(['fullname', 'Họ và tên chủ hồ sơ'], data.fullname);
    setInput(['identityNumber', 'Số định danh cá nhân'], data.identityNumber);
    setInput(['phoneNumber', 'Số điện thoại'], data.phoneNumber);
    setInput(['birthday', 'Ngày sinh'], data.birthday);
    setInput(['identityDate', 'Ngày cấp'], data.identityDate);
    setInput(['identityAgency', 'Nơi cấp'], data.identityAgency);

    await setDropdown(['gender', 'Giới tính'], data.gender);
    await setDropdown(['nation', 'Quốc gia'], 'Việt Nam');
    
    await setDropdown(['province', 'Tỉnh/thành phố'], data.province);
    await setDropdown(['village', 'Phường/xã'], data.village);
    setInput(['diaChiChiTietNSD', 'Địa chỉ chi tiết'], data.diaChiChiTietNSD);

    await setDropdown(['currentProvince', 'Tỉnh/thành phố'], data.currentProvince);
    await setDropdown(['currentVillage', 'Phường/xã'], data.currentVillage);
    setInput(['currentProvinceAddressDetail', 'Địa chỉ chi tiết'], data.currentProvinceAddressDetail);
    setInput(['contactAddress', 'Địa chỉ liên hệ'], data.contactAddress);
  };

  const fillThongTinChiTiet = async () => {
    await setDropdown(['educationLevel', 'Trình độ đào tạo'], data.educationLevel);
    await setDropdown(['trainingField', 'Chuyên ngành đào tạo'], data.trainingField);
    setInput(['terminationDate', 'Ngày chấm dứt hợp đồng lao động'], data.terminationDate);
    
    await setDropdown(['preTerminationWorkIndustry', 'Ngành làm việc trước khi chấm dứt HĐLĐ'], data.preTerminationWorkIndustry);
    await setDropdown(['preTerminationWorkOccupation', 'Nghề làm việc trước khi chấm dứt HĐLĐ'], data.preTerminationWorkOccupation);
    
    setInput(['coQuan', 'Đơn vị chấm dứt HĐ lao động'], data.coQuan);
    await setDropdown(['preTerminationWorkProvince', 'Tỉnh/thành phố nơi đơn vị chấm dứt HĐLĐ'], data.preTerminationWorkProvince);
    await setDropdown(['village2', 'Phường/xã nơi đơn vị chấm dứt HĐLĐ'], data.village2); 
    
    await setDropdown(['contractType', 'Loại hợp đồng lao động/hợp đồng làm việc'], data.contractType);
    await setDropdown(['terminationReason', 'Lý do chấm dứt'], data.terminationReason);
    
    setInput(['unemploymentInsuranceMonths', 'Số tháng đóng bảo hiểm thất nghiệp'], data.unemploymentInsuranceMonths);
    await setDropdown(['socialInsuranceProvince', 'Tỉnh/thành phố nơi hưởng trợ cấp thất nghiệp'], data.socialInsuranceProvince);
    
    await delay(500);
    await setDropdown(['initialMedicalRegistrationPlace', 'Nơi đăng ký khám chữa bệnh ban đầu'], data.initialMedicalRegistrationPlace);

    // Xử lý Ngân hàng
    const radio = Array.from(document.querySelectorAll('label, span, div'))
      .find(el => el.textContent.trim().includes('Nhận trợ cấp thất nghiệp qua tài khoản ngân hàng') && el.children.length === 0)
      ?.closest('label, .form-check')?.querySelector('input[type="radio"]');
    
    if (radio) { radio.click(); radio.dispatchEvent(new Event('change', {bubbles: true})); }
    await delay(800);
    
    setInput(['Số tài khoản'], data.bankAccount);
    setInput(['Chủ tài khoản'], data.accountHolder);
    await setDropdown(['Tại Ngân hàng'], data.bankName);
  };

  const showNotification = () => {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="dvc-auto-fill-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
        <div style="background: white; padding: 25px 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); max-width: 400px; text-align: center; font-family: Arial, sans-serif;">
          <h3 style="margin-top: 0; color: #28a745; font-size: 20px; margin-bottom: 15px;">✅ Hoàn tất điền form!</h3>
          <p style="color: #444; margin-bottom: 25px; font-size: 15px; line-height: 1.5;">Đã điền xong thông tin công dân, vui lòng kiểm tra lại dữ liệu.</p>
          <button id="dvc-modal-ok-btn" style="background: #0056b3; color: white; border: none; padding: 10px 30px; border-radius: 5px; font-size: 14px; cursor: pointer; font-weight: bold;">OK</button>
        </div>
      </div>
    `);
    document.getElementById('dvc-modal-ok-btn').addEventListener('click', () => document.getElementById('dvc-auto-fill-modal').remove());
  };

  (async () => {
    if (mode === 'officer') {
      await switchTab('Thông tin chung'); await fillThongTinChung();
      await switchTab('Thông tin chi tiết'); await fillThongTinChiTiet();
    } else {
      await fillThongTinChung(); await fillThongTinChiTiet();
    }
    showNotification();
  })();
});