document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

const getParsedData = (textAreaId) => {
  const lines = document.getElementById(textAreaId).value.split('\n').map(l => l.trim()).filter(Boolean);
  const getVal = key => lines[lines.findIndex(l => l.toUpperCase() === key.toUpperCase()) + 1] || '';
  
  const formatDate = str => str ? str.split('/').map((p, i) => i < 2 ? p.padStart(2, '0') : p).join('/') : '';
  const cleanPrefix = str => str ? str.replace(/^\d+\.\s*/, '').trim() : '';
  const extractBank = str => str ? (str.match(/\(([^)]+)\)/)?.[1] || str).trim() : '';
  
  const capPrefix = txt => txt ? txt.replace(/^(phường|xã|thị trấn|quận|huyện|thành phố|tỉnh)\s+/i, m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()) : '';
  const parseAddr = str => {
    const p = (str || '').split(',').map(s => s.trim());
    return { detail: p[0] || '', village: capPrefix(p[1]), province: capPrefix(p[2]) };
  };

  const mapTrainField = str => {
    const low = (str || '').toLowerCase();
    return low.match(/quản lý công nghiệp|quản lý xây dựng|quản lý y tế/) ? str : (low.match(/quản trị|quản lý/) ? 'Quản trị - Quản lý' : str);
  };

  const thuongTru = parseAddr(getVal('NƠI THƯỜNG TRÚ'));
  const hienTai = parseAddr(getVal('NƠI Ở HIỆN NAY'));

  return {
    fullname: getVal('HỌ VÀ TÊN'),
    gender: getVal('GIỚI TÍNH'),
    birthday: formatDate(getVal('NĂM SINH')),
    identityNumber: getVal('SỐ CĂN CƯỚC'),
    identityDate: formatDate(getVal('NGÀY CẤP CĂN CƯỚC')),
    identityAgency: getVal('NƠI CẤP CĂN CƯỚC'),
    phoneNumber: getVal('SỐ ĐIỆN THOẠI'),
    
    diaChiChiTietNSD: thuongTru.detail, village: thuongTru.village, province: thuongTru.province,
    currentProvinceAddressDetail: hienTai.detail, currentVillage: hienTai.village, currentProvince: hienTai.province,
    contactAddress: getVal('NƠI Ở HIỆN NAY'),
    
    educationLevel: getVal('TRÌNH ĐỘ ĐÀO TẠO'), trainingField: mapTrainField(getVal('CHUYÊN NGÀNH ĐÀO TẠO')),
    terminationDate: formatDate(getVal('NGÀY NGHỈ VIỆC')), coQuan: getVal('TÊN CÔNG TY/DOANH NGHIỆP'),
    preTerminationWorkProvince: capPrefix(getVal('TỈNH LÀM VIỆC')), village2: capPrefix(getVal('PHƯỜNG/XÃ NƠI LÀM VIỆC')),
    unemploymentInsuranceMonths: getVal('TỔNG SỐ THÁNG ĐÓNG BHTN'),
    
    socialInsuranceProvince: hienTai.province, initialMedicalRegistrationPlace: getVal('NƠI KHÁM CHỮA BỆNH'),
    preTerminationWorkIndustry: cleanPrefix(getVal('NGÀNH NGHỀ SXKD')), preTerminationWorkOccupation: cleanPrefix(getVal('MÃ NGHỀ CV81')),
    contractType: getVal('LOẠI HĐLĐ'), terminationReason: getVal('NGUYÊN NHÂN CV81'),
    
    bankAccount: getVal('SỐ TÀI KHOẢN'), bankName: extractBank(getVal('TÊN NGÂN HÀNG')), accountHolder: getVal('HỌ VÀ TÊN')
  };
};

const triggerFill = async (mode, textAreaId) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }, () => {
      chrome.tabs.sendMessage(tab.id, { action: 'fill_form', mode, data: getParsedData(textAreaId) });
    });
  }
};

document.getElementById('fillBtn').addEventListener('click', () => triggerFill('citizen', 'dataInputCitizen'));
document.getElementById('fillOfficerBtn').addEventListener('click', () => triggerFill('officer', 'dataInputOfficer'));