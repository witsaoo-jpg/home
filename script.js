document.addEventListener('DOMContentLoaded', () => {
    // กำหนดตัวแปร DOM Elements
    const form = document.getElementById('maintenanceForm');
    const tableBody = document.querySelector('#maintenanceTable tbody');
    const filterItem = document.getElementById('filterItem');
    const searchQuery = document.getElementById('searchQuery');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const totalCostSpan = document.getElementById('totalCost');
    const categorySummaryDiv = document.getElementById('categorySummary');

    // ตัวแปรสำหรับ input วันที่และเวลาที่เลือกเอง (Service Date/Time)
    const recordDateInput = document.getElementById('recordDate');
    const recordTimeInput = document.getElementById('recordTime');

    // โหลดข้อมูลจาก Local Storage
    let maintenanceRecords = JSON.parse(localStorage.getItem('maintenanceRecords')) || [];

    // --- Helper Function: แปลงวันที่ ISO (YYYY-MM-DD) เป็นรูปแบบไทย (DD/MM/YYYY) ---
    const formatDateForDisplay = (isoDate) => {
        if (!isoDate) return 'N/A';
        // สร้าง Date object จาก ISO string และกำหนดให้เป็นต้นวันเพื่อลดปัญหา Timezone
        const dateObj = new Date(isoDate + 'T00:00:00');
        if (isNaN(dateObj)) return 'N/A';
        // แปลงเป็นรูปแบบวันที่ไทย (เช่น 19/11/2568)
        return dateObj.toLocaleDateString('th-TH');
    };

    // --- 1. ฟังก์ชัน SweetAlert Helpers (ไม่เปลี่ยนแปลง) ---
    const showSuccess = (title, text) => {
        Swal.fire({ icon: 'success', title: title, text: text, timer: 1500, showConfirmButton: false });
    };

    const showError = (title, text) => {
        Swal.fire({ icon: 'error', title: title, text: text });
    };

    // --- 2. ฟังก์ชันการจัดการข้อมูล (ไม่เปลี่ยนแปลง) ---
    const saveRecords = () => {
        localStorage.setItem('maintenanceRecords', JSON.stringify(maintenanceRecords));
        renderSummary(); 
    };

    // 3. ฟังก์ชันสรุปค่าใช้จ่าย (ไม่เปลี่ยนแปลง)
    const renderSummary = (records = maintenanceRecords) => {
        let totalCost = 0;
        const categoryTotals = {};
        
        records.forEach(record => {
            const price = parseFloat(record.price) || 0;
            totalCost += price;

            if (!categoryTotals[record.item]) {
                categoryTotals[record.item] = 0;
            }
            categoryTotals[record.item] += price;
        });

        totalCostSpan.textContent = totalCost.toFixed(2).toLocaleString('th-TH');

        let summaryHtml = '';
        for (const item in categoryTotals) {
            summaryHtml += `
                <div>
                    <strong>${item}:</strong> 
                    <span>${categoryTotals[item].toFixed(2).toLocaleString('th-TH')} บาท</span>
                </div>`;
        }
        categorySummaryDiv.innerHTML = summaryHtml || '<p>ไม่มีรายการบำรุงรักษา</p>';
    };
    
    // 4. ฟังก์ชันการกรองข้อมูล (ไม่เปลี่ยนแปลง)
    const filterRecords = () => {
        const selectedItem = filterItem.value;
        const query = searchQuery.value.toLowerCase().trim();

        let filtered = maintenanceRecords;

        if (selectedItem !== 'all') {
            filtered = filtered.filter(record => record.item === selectedItem);
        }

        if (query) {
            filtered = filtered.filter(record => 
                record.technician.toLowerCase().includes(query) || 
                record.notes.toLowerCase().includes(query)
            );
        }
        
        renderTable(filtered); 
        renderSummary(filtered);
        return filtered;
    };

    // 5. ฟังก์ชันส่งออกเป็น CSV (*** อัปเดต Headers เพื่อส่งออกข้อมูล Service Date/Time ด้วย ***)
    const exportToCsv = () => {
        const filtered = filterRecords(); 
        if (filtered.length === 0) {
             showError('ไม่สำเร็จ', 'ไม่มีข้อมูลให้ส่งออก');
             return;
        }

        // Headers: แสดงทั้งวันที่บันทึก (ระบบ) และ วันที่เข้าบริการ (ผู้ใช้กรอก)
        const headers = [
            "วันที่บันทึก (ระบบ)", "เวลาบันทึก (ระบบ)", 
            "วันที่เข้าบริการ (ที่กรอก)", "เวลาเข้าบริการ (ที่กรอก)",
            "รายการ", "ราคา", "ช่าง", "หมายเหตุ"
        ];
        
        const rows = filtered.map(record => [
            `"${record.date || ''}"`, // วันที่บันทึก (ระบบ)
            `"${record.time || ''}"`, // เวลาบันทึก (ระบบ)
            `"${record.serviceDate || 'N/A'}"`, // วันที่เข้าบริการ (ที่กรอก)
            `"${record.serviceTime || 'N/A'}"`, // เวลาเข้าบริการ (ที่กรอก)
            `"${record.item || ''}"`,
            record.price,
            `"${record.technician || ''}"`,
            `"${record.notes || ''}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "maintenance_report.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        showSuccess('ส่งออกสำเร็จ!', 'ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว');
    };
    
    // 6. แสดงข้อมูลในตาราง (Render Table - ใช้ record.date และ record.time ซึ่งตอนนี้คือ Submission Time)
    const renderTable = (records = maintenanceRecords) => {
        tableBody.innerHTML = ''; 
        const labels = ['วันที่', 'เวลา', 'รายการ', 'ราคา (บาท)', 'ช่าง', 'หมายเหตุ', 'จัดการ']; 

        if (records.length === 0) {
             const row = tableBody.insertRow();
             const cell = row.insertCell();
             cell.colSpan = 7; 
             cell.textContent = "ไม่มีรายการบำรุงรักษาในขณะนี้ หรือไม่พบข้อมูลตามการกรอง";
             cell.style.textAlign = 'center';
             return;
        }

        records.forEach(record => {
            const row = tableBody.insertRow();
            row.dataset.id = record.id; 
            
            // การแสดงผล: ใช้ record.date และ record.time ซึ่งตอนนี้คือ 'วันที่เราบันทึก'
            const data = [
                record.date || 'N/A', 
                record.time || 'N/A', 
                record.item,
                record.price.toFixed(2),
                record.technician,
                record.notes
            ];
            
            data.forEach((value, index) => {
                const cell = row.insertCell();
                cell.textContent = value;
                cell.setAttribute('data-label', labels[index]); 
            });

            // คอลัมน์ที่ 7: จัดการ
            const actionCell = row.insertCell();
            actionCell.setAttribute('data-label', 'จัดการ'); 
            
            const editBtn = document.createElement('button');
            editBtn.textContent = 'แก้ไข';
            editBtn.className = 'edit-btn';
            editBtn.onclick = () => editRecord(record.id);
            actionCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'ลบ';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => confirmDelete(record.id);
            actionCell.appendChild(deleteBtn);
        });
    };

    // 7. ฟังก์ชันสำหรับเพิ่มรายการใหม่ (*** IMPORTANT: บันทึก Submission Time ใน fields 'date'/'time' ***)
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. ดึงค่า Service Date/Time (ที่ผู้ใช้กรอก)
        const serviceDateISO = recordDateInput.value; // YYYY-MM-DD
        const serviceTime = recordTimeInput.value;   // HH:MM

        // 2. ดึงค่ารายการ
        const item = document.getElementById('item').value;
        const price = parseFloat(document.getElementById('price').value);
        const technician = document.getElementById('technician').value;
        const notes = document.getElementById('notes').value;

        // 3. *** สร้าง Submission Date/Time (วันที่เราบันทึก) ***
        const submissionDate = new Date().toLocaleDateString('th-TH'); // วันที่ระบบ
        const submissionTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); // เวลา 24 ชม. ระบบ
        
        const id = Date.now(); 

        if (!serviceDateISO || !serviceTime || !item || isNaN(price) || !technician) {
            showError('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกวันที่และเวลาเข้าบริการ พร้อมทั้งกรอกข้อมูลรายการ, ราคา, และชื่อช่างให้ครบ');
            return;
        }

        // แปลง service date สำหรับบันทึกในรูปแบบแสดงผล (DD/MM/YYYY)
        const serviceDateDisplay = formatDateForDisplay(serviceDateISO);
        
        // โครงสร้างรายการใหม่: ใช้ Submission Time สำหรับแสดงผลในตาราง (date/time)
        const newRecord = { 
            id, 
            date: submissionDate,       // วันที่บันทึกจริง (แสดงในตาราง)
            time: submissionTime,       // เวลาบันทึกจริง (แสดงในตาราง)
            serviceDate: serviceDateDisplay, // วันที่เข้าบริการ (เก็บไว้)
            serviceTime: serviceTime,       // เวลาเข้าบริการ (เก็บไว้)
            item, 
            price, 
            technician, 
            notes 
        };
        maintenanceRecords.push(newRecord);
        saveRecords();
        filterRecords(); 

        showSuccess('บันทึกสำเร็จ!', 'รายการบำรุงรักษาได้ถูกบันทึกแล้ว');
        form.reset(); 
    });

    // 8. ฟังก์ชันแก้ไขรายการ (ไม่เปลี่ยนแปลง)
    const editRecord = (id) => {
        const recordIndex = maintenanceRecords.findIndex(r => r.id === id);
        const record = maintenanceRecords[recordIndex];

        if (!record) return;

        Swal.fire({
            title: `แก้ไขรายการ: ${record.item}`,
            html: `
                <label>รายการ:</label>
                <select id="swal-item" class="swal2-input">
                    <option value="แอร์Daikin" ${record.item === 'แอร์Daikin' ? 'selected' : ''}>แอร์ Daikin</option>
                    <option value="แอร์Mitsubishi" ${record.item === 'แอร์Mitsubishi' ? 'selected' : ''}>แอร์ Mitsubishi</option>
                    <option value="ปั๊มน้ำ" ${record.item === 'ปั๊มน้ำ' ? 'selected' : ''}>ปั๊มน้ำ</option>
                    <option value="ระบบไฟ" ${record.item === 'ระบบไฟ' ? 'selected' : ''}>ระบบไฟ</option>
                    <option value="ระบบน้ำ" ${record.item === 'ระบบน้ำ' ? 'selected' : ''}>ระบบน้ำ</option>
                </select>
                <label>ราคา (บาท):</label>
                <input id="swal-price" type="number" class="swal2-input" value="${record.price}">
                <label>ช่าง:</label>
                <input id="swal-technician" class="swal2-input" value="${record.technician}">
                <label>หมายเหตุ:</label>
                <textarea id="swal-notes" class="swal2-textarea">${record.notes}</textarea>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึกการแก้ไข',
            preConfirm: () => {
                const item = document.getElementById('swal-item').value;
                const price = parseFloat(document.getElementById('swal-price').value);
                const technician = document.getElementById('swal-technician').value;
                const notes = document.getElementById('swal-notes').value;

                if (!item || isNaN(price) || !technician) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                    return false;
                }
                return { item, price, technician, notes };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const { item, price, technician, notes } = result.value;
                
                maintenanceRecords[recordIndex].item = item;
                maintenanceRecords[recordIndex].price = price;
                maintenanceRecords[recordIndex].technician = technician;
                maintenanceRecords[recordIndex].notes = notes;
                
                // ไม่ได้แก้ไขวันที่/เวลาที่บันทึกจริง
                
                saveRecords();
                filterRecords(); 
                showSuccess('แก้ไขสำเร็จ!', 'ข้อมูลได้รับการอัปเดตแล้ว');
            }
        });
    };

    // 9. ยืนยันและลบรายการ (ไม่เปลี่ยนแปลง)
    const confirmDelete = (id) => {
        Swal.fire({
            title: 'แน่ใจหรือไม่?',
            text: "คุณจะไม่สามารถกู้คืนรายการนี้ได้!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ใช่, ลบเลย!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                maintenanceRecords = maintenanceRecords.filter(r => r.id !== id);
                saveRecords();
                filterRecords(); 
                showSuccess('ลบสำเร็จ!', 'รายการที่เลือกถูกลบเรียบร้อยแล้ว');
            }
        });
    };

    // 10. Event Listeners สำหรับการค้นหา กรอง และส่งออก
    filterItem.addEventListener('change', filterRecords);
    searchQuery.addEventListener('input', filterRecords); 
    exportCsvBtn.addEventListener('click', exportToCsv);

    // 11. โหลดข้อมูลเมื่อเริ่มต้น
    filterRecords(); 
});
