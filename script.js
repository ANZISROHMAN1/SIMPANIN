const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbypy_pO1lXsIm6LE7_MxKIQMMiFkGUbyKKky9XDwLr-e4T1b91TcX8odiC-yPLjuDPK/exec";

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Notification Logic
    let newUploadCount = 0;
    const notifBtn = document.getElementById('notif-btn');
    const notifBadge = document.getElementById('notif-badge');
    
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            newUploadCount = 0;
            if (notifBadge) notifBadge.style.display = 'none';
        });
    }
    
    // Upload Functionality
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                
                // Ubah tombol jadi loading
                const originalText = uploadBtn.innerHTML;
                uploadBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Mengunggah...';
                uploadBtn.disabled = true;
                lucide.createIcons();

                try {
                    // 1. Convert file ke Base64
                    const base64Data = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = error => reject(error);
                        reader.readAsDataURL(file);
                    });

                    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "MASUKKAN_URL_GAS_DISINI") {
                        alert("Berhasil disimulasikan! Namun URL Google Apps Script belum dimasukkan di kode script.js.");
                        return;
                    }

                    // 2. Kirim ke Google Apps Script
                    const response = await fetch(GAS_WEB_APP_URL, {
                        method: 'POST',
                        body: new URLSearchParams({
                            fileName: file.name,
                            mimeType: file.type,
                            fileData: base64Data
                        })
                    });

                    let result;
                    const responseText = await response.text();
                    try {
                        result = JSON.parse(responseText);
                    } catch (e) {
                        console.error("Bukan JSON:", responseText);
                        throw new Error("Respon dari server bukan JSON (Mungkin Anda belum mensetting 'Who has access: Anyone' saat Deploy di Google Apps Script)");
                    }

                    if (result.success) {
                        alert(`Sukses! File "${file.name}" berhasil diunggah ke Google Drive.`);
                        console.log('Upload URL:', result.url);
                        
                        // Increment Notification Badge
                        newUploadCount++;
                        if (notifBadge) {
                            notifBadge.textContent = newUploadCount;
                            notifBadge.style.display = 'flex';
                        }
                        
                        // Refresh the file list automatically
                        fetchFiles();
                    } else {
                        alert(`Gagal mengunggah: ${result.error}`);
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                    console.error(error);
                } finally {
                    // Kembalikan kondisi tombol
                    uploadBtn.innerHTML = originalText;
                    uploadBtn.disabled = false;
                    lucide.createIcons();
                    fileInput.value = '';
                }
            }
        });
    }
    // Global state for files
    let realFiles = [];
    let currentActiveFileId = null;
    let currentSortColumn = null;
    let currentSortAsc = true;
    
    // Format Date from string
    function formatDate(dateString) {
        const d = new Date(dateString);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    // Format bytes
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    const rightSidebar = document.querySelector('.sidebar-right');

    function renderFiles(files) {
        const tbody = document.querySelector('.file-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (files.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        Belum ada file di folder ini.
                    </td>
                </tr>
            `;
            return;
        }

        files.forEach(file => {
            // Determine icon
            let icon = 'file';
            let colorClass = 'blue';
            let iconColor = 'var(--accent-blue)';
            let niceType = file.mimeType;
            
            if (file.mimeType.includes('pdf')) {
                icon = 'file-type-2'; colorClass = 'red'; iconColor = 'var(--accent-red)'; niceType = 'Dokumen PDF';
            } else if (file.mimeType.includes('image')) {
                icon = 'image'; colorClass = 'green'; iconColor = 'var(--accent-green)'; niceType = 'Gambar';
            } else if (file.mimeType.includes('spreadsheet') || file.mimeType.includes('excel') || file.mimeType.includes('csv')) {
                icon = 'table'; colorClass = 'green'; iconColor = 'var(--accent-green)'; niceType = 'Spreadsheet';
            }

            const tr = document.createElement('tr');
            tr.className = 'file-row';
            tr.innerHTML = `
                <td>
                    <div class="file-name" style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="folder-icon ${colorClass}" style="width: 32px; height: 32px; display:flex; align-items:center; justify-content:center;">
                            <i data-lucide="${icon}"></i>
                        </div>
                        <span style="font-weight: 500;">${file.name}</span>
                    </div>
                </td>
                <td>${formatBytes(file.size)}</td>
                <td>${formatDate(file.dateCreated)}</td>
                <td>
                    <button class="icon-btn" style="width: 32px; height: 32px;">
                        <i data-lucide="more-horizontal"></i>
                    </button>
                </td>
            `;
            
            // Add click event for sidebar
            tr.addEventListener('click', () => {
                document.querySelectorAll('.file-row').forEach(r => r.classList.remove('active-row'));
                tr.classList.add('active-row');
                
                // Store active file globally
                currentActiveFileId = file.id;
                
                // Update labels
                const values = rightSidebar.querySelectorAll('.info-value');
                if (values.length >= 4) {
                    values[0].textContent = file.name;
                    values[1].textContent = formatBytes(file.size);
                    values[2].textContent = niceType;
                    values[3].textContent = formatDate(file.dateCreated);
                }
                
                // Update icon in preview
                const previewIconContainer = rightSidebar.querySelector('.file-preview');
                if (previewIconContainer) {
                    previewIconContainer.innerHTML = `<i data-lucide="${icon}" class="preview-icon" style="color: ${iconColor}; width: 64px; height: 64px;"></i>`;
                }
                
                // Update download button logic (open link)
                const downloadBtn = document.querySelector('.sidebar-right .btn-primary');
                if (downloadBtn) {
                    downloadBtn.onclick = () => window.open(file.downloadUrl, '_blank');
                }
                
                lucide.createIcons();
                
                // Add a subtle animation effect to right sidebar
                rightSidebar.style.opacity = '0';
                rightSidebar.style.transform = 'translateX(10px)';
                
                setTimeout(() => {
                    rightSidebar.style.transition = 'all 0.3s ease';
                    rightSidebar.style.opacity = '1';
                    rightSidebar.style.transform = 'translateX(0)';
                }, 50);
            });

            tbody.appendChild(tr);
        });
        
        lucide.createIcons();
    }

    // Helper to render only top 10 latest files
    function renderDefaultView() {
        // Sort realFiles by date descending
        const sorted = [...realFiles].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
        // Take top 10
        renderFiles(sorted.slice(0, 10));
    }

    // Fetch real files on load
    window.fetchFiles = async function() {
        const tbody = document.querySelector('.file-table tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;"><i data-lucide="loader" class="spin"></i> Mengambil data file...</td></tr>';
        lucide.createIcons();

        try {
            // Kita fetch dengan parameter GET
            const response = await fetch(GAS_WEB_APP_URL + "?action=getFiles");
            const data = await response.json();
            
            if (data.success) {
                realFiles = data.files;
                renderDefaultView();
                // Update dashboard counts
                const docCount = document.querySelectorAll('.folder-details p')[0];
                if (docCount) docCount.textContent = realFiles.length + " Files Total";
            } else {
                if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Gagal mengambil daftar file. Apakah skrip GAS sudah diupdate?</td></tr>';
            }
        } catch (err) {
            console.error("Fetch error:", err);
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Menggunakan data dummy. (Perbarui skrip GAS untuk melihat file asli)</td></tr>';
        }
    }

    // Call it
    window.fetchFiles();

    // -----------------------------------------
    // ADDED FEATURES: Search & Category Filter
    // -----------------------------------------
    
    // 1. Search Functionality
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query === '') {
                renderDefaultView();
                return;
            }
            const filteredFiles = realFiles.filter(file => 
                file.name.toLowerCase().includes(query)
            );
            renderFiles(filteredFiles);
        });
    }

    // 2. Category Filter (Akses Cepat)
    const folderCards = document.querySelectorAll('.folder-card');
    folderCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.querySelector('h3').textContent.toLowerCase();
            
            // Highlight clicked card
            folderCards.forEach(c => c.style.borderColor = 'var(--border-color)');
            card.style.borderColor = 'var(--accent-blue)';
            
            let filteredFiles = realFiles;
            if (category === 'dokumen') {
                filteredFiles = realFiles.filter(f => f.mimeType.includes('pdf') || f.mimeType.includes('document') || f.mimeType.includes('text') || f.mimeType.includes('spreadsheet'));
            } else if (category === 'foto') {
                filteredFiles = realFiles.filter(f => f.mimeType.includes('image'));
            } else if (category === 'arsip') {
                filteredFiles = realFiles.filter(f => f.mimeType.includes('zip') || f.mimeType.includes('rar') || f.mimeType.includes('tar'));
            }
            
            renderFiles(filteredFiles);
            
            // Clear search when clicking category
            if (searchInput) searchInput.value = '';
        });
    });
    
    // Double click on title to reset all filters
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        sectionTitle.style.cursor = 'pointer';
        sectionTitle.title = "Klik untuk me-reset filter";
        sectionTitle.addEventListener('click', () => {
            folderCards.forEach(c => c.style.borderColor = 'var(--border-color)');
            if (searchInput) searchInput.value = '';
            renderDefaultView();
        });
    }

    // -----------------------------------------
    // 3. Sorting Functionality
    // -----------------------------------------
    const tableHeaders = document.querySelectorAll('.file-table th');
    tableHeaders.forEach((th, index) => {
        th.addEventListener('click', () => {
            if (index === 3) return; // Skip Action column
            
            // Toggle direction
            if (currentSortColumn === index) {
                currentSortAsc = !currentSortAsc;
            } else {
                currentSortColumn = index;
                currentSortAsc = true;
            }
            
            let sortedFiles = [...realFiles];
            sortedFiles.sort((a, b) => {
                let valA, valB;
                if (index === 0) { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
                else if (index === 1) { valA = a.size; valB = b.size; }
                else if (index === 2) { valA = new Date(a.dateCreated).getTime(); valB = new Date(b.dateCreated).getTime(); }
                
                if (valA < valB) return currentSortAsc ? -1 : 1;
                if (valA > valB) return currentSortAsc ? 1 : -1;
                return 0;
            });
            
            renderFiles(sortedFiles);
        });
    });

    // -----------------------------------------
    // 4. Rename and Delete Actions
    // -----------------------------------------
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!currentActiveFileId) return alert("Pilih file terlebih dahulu!");
            
            if (confirm("Yakin ingin menghapus file ini?")) {
                deleteBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Menghapus...';
                deleteBtn.disabled = true;
                lucide.createIcons();
                
                try {
                    const response = await fetch(GAS_WEB_APP_URL, {
                        method: 'POST',
                        body: new URLSearchParams({ action: 'delete', fileId: currentActiveFileId })
                    });
                    const result = await response.json();
                    if (result.success) {
                        alert("File berhasil dihapus!");
                        rightSidebar.classList.remove('active');
                        fetchFiles();
                    } else {
                        alert("Gagal menghapus: " + result.error);
                    }
                } catch (e) {
                    alert("Terjadi kesalahan jaringan.");
                } finally {
                    deleteBtn.innerHTML = '<i data-lucide="trash"></i> Hapus';
                    deleteBtn.disabled = false;
                    lucide.createIcons();
                }
            }
        });
    }

    const renameBtn = document.getElementById('rename-btn');
    if (renameBtn) {
        renameBtn.addEventListener('click', async () => {
            if (!currentActiveFileId) return alert("Pilih file terlebih dahulu!");
            
            const currentName = rightSidebar.querySelectorAll('.info-value')[0].textContent;
            const newName = prompt("Masukkan nama baru untuk file ini:", currentName);
            
            if (newName && newName !== currentName) {
                renameBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Mengubah...';
                renameBtn.disabled = true;
                lucide.createIcons();
                
                try {
                    const response = await fetch(GAS_WEB_APP_URL, {
                        method: 'POST',
                        body: new URLSearchParams({ action: 'rename', fileId: currentActiveFileId, newName: newName })
                    });
                    const result = await response.json();
                    if (result.success) {
                        alert("Nama file berhasil diubah!");
                        fetchFiles();
                    } else {
                        alert("Gagal mengubah nama: " + result.error);
                    }
                } catch (e) {
                    alert("Terjadi kesalahan jaringan.");
                } finally {
                    renameBtn.innerHTML = '<i data-lucide="edit-2"></i> Ganti Nama';
                    renameBtn.disabled = false;
                    lucide.createIcons();
                }
            }
        });
    }
});
