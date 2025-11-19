document.addEventListener('DOMContentLoaded', () => {
    // กำหนดตัวแปร DOM Elements
    const form = document.getElementById('maintenanceForm');
    const tableBody = document.querySelector('#maintenanceTable tbody');
    
    // โหลดข้อมูลจาก Local Storage หรือใช้ Array ว่างหากไม่มีข้อมูล
    let maintenanceRecords = JSON.parse(localStorage.getItem('maintenanceRecords')) || [];

    // --- 1. ฟังก์ชัน SweetAlert Helpers ---

    // แจ้งเตือนสำเร็จ
    const showSuccess = (title, text) => {
        Swal.fire({
            icon: 'success',
            title: title,
            text: text,
            timer: 1500,
            showConfirmButton: false
        });
    };

    // แจ้งเตือนล้มเหลว/ข้อผิดพลาด
    const showError = (title, text) => {
        Swal.fire({
            icon: 'error',
            title: title,
            text: text
        });
    };

    // --- 2. ฟังก์ชันการจัดการข้อมูล ---

    // บันทึกข้อมูลลงใน Local Storage
    const saveRecords = () => {
        localStorage.setItem('maintenanceRecords', JSON.stringify(maintenanceRecords));
    };

    // 3. แสดงข้อมูลในตาราง (Render Table)
    const renderTable = () => {
        tableBody.innerHTML = ''; // ล้างข้อมูลเดิมทั้งหมด

        // ลำดับหัวข้อสำหรับ Responsive Table ในมือถือ
        const labels = ['ประทับเวลา', 'รายการ', 'ราคา (บาท)', 'ช่าง', 'หมายเหตุ', 'จัดการ'];

        maintenanceRecords.forEach(record => {
            const row = tableBody.insertRow();
            row.dataset.id = record.id; 
            
            // ข้อมูลที่ต้องการแสดงผล
            const data = [
                record.timestamp,
                record.item,
                record.price.toFixed(2),
                record.technician,
                record.notes
            ];
            
            // สร้าง Cell ข้อมูล (ยกเว้นคอลัมน์จัดการ)
            data.forEach((value, index) => {
                const cell = row.insertCell();
                cell.textContent = value;
                // กำหนด data-label สำหรับการแสดงผล Responsive บนมือถือ
                cell.setAttribute('data-label', labels[index]);
            });

            // คอลัมน์ที่ 6: จัดการ (ปุ่มแก้ไข/ลบ)
            const actionCell = row.insertCell();
            actionCell.setAttribute('data-label', 'จัดการ'); 
            
            // ปุ่มแก้ไข
            const editBtn = document.createElement('button');
            editBtn.textContent = 'แก้ไข';
            editBtn.className = 'edit-btn';
            editBtn.onclick = () => editRecord(record.id);
            actionCell.appendChild(editBtn);

            // ปุ่มลบ
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'ลบ';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => confirmDelete(record.id);
            actionCell.appendChild(deleteBtn);
        });
    };

    // 4. ฟังก์ชันสำหรับเพิ่มรายการใหม่
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const item = document.getElementById('item').value;
        const price = parseFloat(document.getElementById('price').value);
        const technician = document.getElementById('technician').value;
        const notes = document.getElementById('notes').value;
        
        // สร้างประทับเวลา
        const timestamp = new Date().toLocaleString('th-TH'); 
        const id = Date.now(); 

        if (!item || isNaN(price) || !technician) {
            showError('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกรายการ, ราคา, และชื่อช่างให้ครบ');
            return;
        }

        const newRecord = { id, timestamp, item, price, technician, notes };
        maintenanceRecords.push(newRecord);
        saveRecords();
        renderTable();

        showSuccess('บันทึกสำเร็จ!', 'รายการบำรุงรักษาได้ถูกบันทึกแล้ว');
        form.reset(); 
    });

    // 5. ฟังก์ชันแก้ไขรายการ (ใช้ SweetAlert2 ในการรับข้อมูล)
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
                
                // อัปเดตข้อมูล
                maintenanceRecords[recordIndex].item = item;
                maintenanceRecords[recordIndex].price = price;
                maintenanceRecords[recordIndex].technician = technician;
                maintenanceRecords[recordIndex].notes = notes;
                
                saveRecords();
                renderTable();
                showSuccess('แก้ไขสำเร็จ!', 'ข้อมูลได้รับการอัปเดตแล้ว');
            }
        });
    };

    // 6. ยืนยันและลบรายการ
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
                // กรองรายการที่จะลบออก
                maintenanceRecords = maintenanceRecords.filter(r => r.id !== id);
                saveRecords();
                renderTable();
                showSuccess('ลบสำเร็จ!', 'รายการที่เลือกถูกลบเรียบร้อยแล้ว');
            }
        });
    };

    // 7. โหลดและแสดงข้อมูลเมื่อหน้าเว็บพร้อมใช้งาน
    renderTable();
});
