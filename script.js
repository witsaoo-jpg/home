document.addEventListener('DOMContentLoaded', () => {
    // กำหนดตัวแปร DOM Elements
    const form = document.getElementById('maintenanceForm');
    const tableBody = document.querySelector('#maintenanceTable tbody');
    const filterItem = document.getElementById('filterItem');
    const searchQuery = document.getElementById('searchQuery');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const totalCostSpan = document.getElementById('totalCost');
    const categorySummaryDiv = document.getElementById('categorySummary');

    // โหลดข้อมูลจาก Local Storage
    let maintenanceRecords = JSON.parse(localStorage.getItem('maintenanceRecords')) || [];

    // --- 1. ฟังก์ชัน SweetAlert Helpers ---
    const showSuccess = (title, text) => {
        Swal.fire({ icon: 'success', title: title, text: text, timer: 1500, showConfirmButton: false });
    };

    const showError = (title, text) => {
        Swal.fire({ icon: 'error', title: title, text: text });
    };

    // --- 2. ฟังก์ชันการจัดการข้อมูล ---
    const saveRecords = () => {
        localStorage.setItem('maintenanceRecords', JSON.stringify(maintenanceRecords));
        renderSummary(); 
    };

    // 3. ฟังก์ชันสรุปค่าใช้จ่าย
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
    
    // 4. ฟังก์ชันการกรองข้อมูล
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
        return filtered; // ส่งคืนค่าที่ถูกกรองสำหรับการส่งออก CSV
    };

    // 5. ฟังก์ชันส่งออกเป็น CSV
    const exportToCsv = () => {
        const filtered = filterRecords(); 
        if (filtered.length === 0) {
             showError('ไม่สำเร็จ', 'ไม่มีข้อมูลให้ส่งออก');
             return;
        }

        // อัปเดต Headers ให้ตรงกับโครงสร้างใหม่
        const headers = ["วันที่", "เวลา", "รายการ", "ราคา", "ช่าง", "หมายเหตุ"];
        const rows = filtered.map(record => [
            `"${record.date.replace(/"/g, '""')}"`, // ใช้ record.date
            `"${record.time.replace(/"/g, '""')}"`, // ใช้ record.time
            `"${record.item.replace(/"/g, '""')}"`,
            record.price,
            `"${record.technician.replace(/"/g, '""')}"`,
            `"${record.notes.replace(/"/g, '""')}"`
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
    
    // 6. แสดงข้อมูลในตาราง (Render Table)
    const renderTable = (records = maintenanceRecords) => {
        tableBody.innerHTML = ''; 
        // อัปเดต labels สำหรับ Responsive Table
        // ในส่วนของ script.js 
            const labels = ['ประทับเวลา', 'รายการ', 'ราคา (บาท)', 'ช่าง', 'หมายเหตุ', 'จัดการ'];

        if (records.length === 0) {
             const row = tableBody.insertRow();
             const cell = row.insertCell();
             cell.colSpan = 7; // เปลี่ยนเป็น 7 คอลัมน์ (รวม วันที่ และ เวลา)
             cell.textContent = "ไม่มีรายการบำรุงรักษาในขณะนี้ หรือไม่พบข้อมูลตามการกรอง";
             cell.style.textAlign = 'center';
             return;
        }

        records.forEach(record => {
            const row = tableBody.insertRow();
            row.dataset.id = record.id; 
            
            // *** การแสดงผล: ใช้ record.date และ record.time ***
           const data = [
    // รวมวันที่และเวลาในคอลัมน์เดียว
    `${record.date || 'N/A'} ${record.time || ''}`, 
    record.item,
    record.price.toFixed(2),
    // ... คอลัมน์ที่เหลือ
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

    // 7. ฟังก์ชันสำหรับเพิ่มรายการใหม่ (การสร้าง record object ใหม่)
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const item = document.getElementById('item').value;
        const price = parseFloat(document.getElementById('price').value);
        const technician = document.getElementById('technician').value;
        const notes = document.getElementById('notes').value;
        
        // *** การบันทึก: แยก Date และ Time ออกจากกัน ***
        const date = new Date().toLocaleDateString('th-TH'); 
        // แสดงเวลาเป็น hh:mm:ss
        const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const id = Date.now(); 

        if (!item || isNaN(price) || !technician) {
            showError('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกรายการ, ราคา, และชื่อช่างให้ครบ');
            return;
        }

        // โครงสร้างรายการใหม่: ใช้ date และ time
        const newRecord = { id, date, time, item, price, technician, notes };
        maintenanceRecords.push(newRecord);
        saveRecords();
        filterRecords(); 

        showSuccess('บันทึกสำเร็จ!', 'รายการบำรุงรักษาได้ถูกบันทึกแล้ว');
        form.reset(); 
    });

    // 8. ฟังก์ชันแก้ไขรายการ (ใช้ filterRecords ในการแสดงผลหลังแก้ไข)
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
                
                saveRecords();
                filterRecords(); 
                showSuccess('แก้ไขสำเร็จ!', 'ข้อมูลได้รับการอัปเดตแล้ว');
            }
        });
    };

    // 9. ยืนยันและลบรายการ (ใช้ filterRecords ในการแสดงผลหลังลบ)
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
