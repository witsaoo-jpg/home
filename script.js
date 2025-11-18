document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('maintenanceForm');
    const tableBody = document.querySelector('#maintenanceTable tbody');
    // ใช้ localStorage เพื่อเก็บข้อมูล (ข้อมูลจะไม่หายไปเมื่อปิด/เปิดเบราว์เซอร์)
    let maintenanceRecords = JSON.parse(localStorage.getItem('maintenanceRecords')) || [];

    // --- ฟังก์ชัน SweetAlert ---

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

    // --- ฟังก์ชันการทำงานหลัก ---

    // 1. เพิ่มรายการใหม่
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const item = document.getElementById('item').value;
        const price = parseFloat(document.getElementById('price').value);
        const technician = document.getElementById('technician').value;
        const notes = document.getElementById('notes').value;
        const timestamp = new Date().toLocaleString('th-TH');
        const id = Date.now(); // ใช้ timestamp เป็น unique ID

        if (!item || isNaN(price) || !technician) {
            showError('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกรายการ, ราคา, และชื่อช่างให้ครบ');
            return;
        }

        const newRecord = { id, timestamp, item, price, technician, notes };
        maintenanceRecords.push(newRecord);
        saveRecords();
        renderTable();

        showSuccess('บันทึกสำเร็จ!', 'รายการบำรุงรักษาได้ถูกบันทึกเรียบร้อยแล้ว');
        form.reset(); // ล้างฟอร์ม
    });

    // 2. แสดงข้อมูลในตาราง (Render Table)
    const renderTable = () => {
        tableBody.innerHTML = ''; // ล้างข้อมูลเดิมทั้งหมด

        maintenanceRecords.forEach(record => {
            const row = tableBody.insertRow();
            row.dataset.id = record.id; // เก็บ ID ไว้ที่แถวเพื่อใช้อ้างอิง

            // คอลัมน์ที่ 1: ประทับเวลา
            row.insertCell().textContent = record.timestamp;
            // คอลัมน์ที่ 2: รายการ
            row.insertCell().textContent = record.item;
            // คอลัมน์ที่ 3: ราคา
            row.insertCell().textContent = record.price.toFixed(2);
            // คอลัมน์ที่ 4: ช่าง
            row.insertCell().textContent = record.technician;
            // คอลัมน์ที่ 5: หมายเหตุ
            row.insertCell().textContent = record.notes;
            
            // คอลัมน์ที่ 6: จัดการ (ปุ่มแก้ไข/ลบ)
            const actionCell = row.insertCell();
            
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

    // 3. บันทึกข้อมูลลงใน Local Storage
    const saveRecords = () => {
        localStorage.setItem('maintenanceRecords', JSON.stringify(maintenanceRecords));
    };

    // 4. ฟังก์ชันแก้ไขรายการ (ใช้ SweetAlert2 ในการรับข้อมูล)
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
                // ไม่อัปเดต timestamp
                
                saveRecords();
                renderTable();
                showSuccess('แก้ไขสำเร็จ!', 'ข้อมูลได้รับการอัปเดตแล้ว');
            }
        });
    };

    // 5. ยืนยันการลบรายการ
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

    // โหลดข้อมูลเมื่อเริ่มต้น
    renderTable();
});