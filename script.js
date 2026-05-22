document.addEventListener('DOMContentLoaded', () => {
    const APP_VERSION = "1.0.0";

    // DOM Elements
    const elements = {
        appVersion: document.getElementById('app-version'),
        
        // Modals
        updateModal: document.getElementById('update-modal'),
        creditsModal: document.getElementById('credits-modal'),
        changelogModal: document.getElementById('changelog-modal'),
        helpModal: document.getElementById('help-modal'),
        
        // Modal Trigger Buttons
        btnCheckUpdates: document.getElementById('btn-check-updates'),
        btnCredits: document.getElementById('btn-credits'),
        btnChangelog: document.getElementById('btn-changelog'),
        btnHelp: document.getElementById('btn-help'),
        
        // Modal Close Buttons
        closeUpdate: document.getElementById('close-update'),
        closeCredits: document.getElementById('close-credits'),
        closeChangelog: document.getElementById('close-changelog'),
        closeHelp: document.getElementById('close-help'),
        
        // Project details inputs
        projZone: document.getElementById('proj-zone'),
        projDivision: document.getElementById('proj-division'),
        projPway: document.getElementById('proj-pway'),
        projBlock: document.getElementById('proj-block'),
        projLine: document.getElementById('proj-line'),
        projKm: document.getElementById('proj-km'),
        projLoa: document.getElementById('proj-loa'),
        
        // Config inputs
        startChainage: document.getElementById('start-chainage'),
        endChainage: document.getElementById('end-chainage'),
        interval: document.getElementById('interval'),
        maxLift: document.getElementById('max-lift'),
        maxLower: document.getElementById('max-lower'),
        
        // Limit inputs
        limitV20: document.getElementById('limit-v20'),
        limitV80: document.getElementById('limit-v80'),
        limitSD20: document.getElementById('limit-sd20'),
        limitSD80: document.getElementById('limit-sd80'),
        
        // Actions
        btnGenerate: document.getElementById('btn-generate'),
        btnDownloadTemplate: document.getElementById('btn-download-template'),
        btnImportExcel: document.getElementById('btn-import-excel'),
        excelUpload: document.getElementById('excel-upload'),
        btnReset: document.getElementById('btn-reset'),
        
        // Solver
        optimizerSection: document.getElementById('optimizer-section'),
        btnRunSolver: document.getElementById('btn-run-solver'),
        btnStopSolver: document.getElementById('btn-stop-solver'),
        optSmoothWeight: document.getElementById('opt-smooth-weight'),
        optIterations: document.getElementById('opt-iterations'),
        solverProgressCard: document.getElementById('solver-progress-card'),
        solverProgressFill: document.getElementById('solver-progress-fill'),
        solverProgressText: document.getElementById('solver-progress-text'),
        
        // Dashboard
        statsSection: document.getElementById('stats-section'),
        valCompliance: document.getElementById('val-compliance'),
        valMaxLift: document.getElementById('val-max-lift'),
        valMaxLower: document.getElementById('val-max-lower'),
        valMaxV20: document.getElementById('val-max-v20'),
        valMaxV80: document.getElementById('val-max-v80'),
        valMaxSD20: document.getElementById('val-max-sd20'),
        valMaxSD80: document.getElementById('val-max-sd80'),
        
        // Visualizer
        chartSection: document.getElementById('chart-section'),
        zoomHorizontalSlider: document.getElementById('zoom-horizontal-slider'),
        zoomVerticalLeftSlider: document.getElementById('zoom-vertical-left-slider'),
        valVerticalZoom: document.getElementById('val-vertical-zoom'),
        btnResetView: document.getElementById('btn-reset-view'),
        
        // Table & Inspector
        dataSection: document.getElementById('data-section'),
        tableSearch: document.getElementById('table-search'),
        btnExportPdf: document.getElementById('btn-export-pdf'),
        btnExportExcel: document.getElementById('btn-export-excel'),
        levelsTableBody: document.getElementById('levels-table-body'),
        
        // Toast
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message')
    };

    // Global State
    let appState = {
        stations: [], // Array of { id, chainage, existingLevel, proposedLevel, locked, liftLower, v20, v80, sd20, sd80, v20Violated... }
        zoomCenter: 0,
        yCenterOffset: 0
    };

    // Solver state
    let solverState = {
        running: false,
        iteration: 0,
        maxIterations: 1000,
        P: [],
        E: [],
        locked: [],
        m: [],
        v: [],
        t: 0,
        maxLift: 0.050,
        maxLower: 0.050,
        limitV20: 5.0,
        limitV80: 40.0,
        limitSD20: 2.0,
        limitSD80: 20.0,
        intervalMeters: 10.0,
        smoothWeight: 10
    };

    let profileChart = null;
    let liftChart = null;

    // Set Version Text
    if (elements.appVersion) elements.appVersion.textContent = `v${APP_VERSION}`;

    // --- Modal Logic ---
    const showModal = (modal) => modal.classList.remove('hidden');
    const hideModal = (modal) => modal.classList.add('hidden');

    if (elements.btnCheckUpdates) {
        elements.btnCheckUpdates.addEventListener('click', () => {
            elements.btnCheckUpdates.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
            elements.btnCheckUpdates.disabled = true;
            setTimeout(() => {
                elements.btnCheckUpdates.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Updates';
                elements.btnCheckUpdates.disabled = false;
                window.electronAPI.checkForUpdates().then(res => {
                    if (!res.success) {
                        showToast("Failed to check for updates: " + res.error, "error");
                    } else {
                        showToast("Checking for updates...", "success");
                    }
                });
            }, 1500);
        });
    }

    if (elements.closeUpdate) elements.closeUpdate.addEventListener('click', () => hideModal(elements.updateModal));
    document.getElementById('btn-update-cancel').addEventListener('click', () => hideModal(elements.updateModal));
    
    // AutoUpdater Event Handlers
    if (window.electronAPI) {
        window.electronAPI.onUpdateAvailable((info) => {
            const versionText = document.getElementById('update-version-text');
            if (versionText) versionText.textContent = `Version ${info.version} is available!`;
            
            document.getElementById('btn-update-download').classList.remove('hidden');
            document.getElementById('btn-update-install').classList.add('hidden');
            document.getElementById('update-progress-container').classList.add('hidden');
            
            showModal(elements.updateModal);
        });

        window.electronAPI.onUpdateNotAvailable(() => {
            showToast("You are on the latest version.", "success");
        });

        window.electronAPI.onUpdateError((err) => {
            showToast("Update error: " + err, "error");
            hideModal(elements.updateModal);
        });

        window.electronAPI.onDownloadProgress((progressObj) => {
            document.getElementById('update-progress-container').classList.remove('hidden');
            document.getElementById('btn-update-download').classList.add('hidden');
            
            const percent = Math.round(progressObj.percent);
            document.getElementById('update-progress-fill').style.width = `${percent}%`;
            document.getElementById('update-progress-text').textContent = `Downloading: ${percent}% (${(progressObj.transferred / 1000000).toFixed(1)}MB / ${(progressObj.total / 1000000).toFixed(1)}MB)`;
        });

        window.electronAPI.onUpdateDownloaded(() => {
            document.getElementById('update-progress-text').textContent = "Download complete! Ready to install.";
            document.getElementById('btn-update-install').classList.remove('hidden');
            document.getElementById('btn-update-cancel').classList.add('hidden');
        });
    }

    document.getElementById('btn-update-download').addEventListener('click', () => {
        // Normally autoUpdater.downloadUpdate() is called here if autoDownload is false,
        // but since we set autoDownload = true in main.js, it's already downloading.
        // We just keep the modal open to show progress.
        showToast("Update is downloading in the background...", "success");
    });

    document.getElementById('btn-update-install').addEventListener('click', () => {
        if (window.electronAPI) {
            window.electronAPI.installUpdate();
        }
    });

    if (elements.btnCredits) elements.btnCredits.addEventListener('click', () => showModal(elements.creditsModal));
    if (elements.closeCredits) elements.closeCredits.addEventListener('click', () => hideModal(elements.creditsModal));

    if (elements.btnChangelog) elements.btnChangelog.addEventListener('click', () => showModal(elements.changelogModal));
    if (elements.closeChangelog) elements.closeChangelog.addEventListener('click', () => hideModal(elements.changelogModal));

    if (elements.btnHelp) elements.btnHelp.addEventListener('click', () => showModal(elements.helpModal));
    if (elements.closeHelp) elements.closeHelp.addEventListener('click', () => hideModal(elements.helpModal));

    // Close on click outside modal content
    window.addEventListener('click', (e) => {
        [elements.updateModal, elements.creditsModal, elements.changelogModal, elements.helpModal].forEach(modal => {
            if (e.target === modal) hideModal(modal);
        });
    });

    // --- Toast Notifications ---
    function showToast(message, type = "success") {
        if (!elements.toast || !elements.toastMessage) return;
        elements.toastMessage.textContent = message;
        
        // reset classes
        elements.toast.className = "toast";
        if (type === "error") {
            elements.toast.classList.add("toast-error");
        } else if (type === "warning") {
            elements.toast.classList.add("toast-warning");
        }
        
        elements.toast.classList.remove('hidden');
        setTimeout(() => {
            elements.toast.classList.add('hidden');
        }, 3000);
    }

    // --- Event Listeners for Config & Actions ---
    if (elements.btnGenerate) elements.btnGenerate.addEventListener('click', generateGrid);
    if (elements.btnReset) elements.btnReset.addEventListener('click', resetApp);
    if (elements.btnDownloadTemplate) elements.btnDownloadTemplate.addEventListener('click', downloadTemplate);
    if (elements.btnImportExcel) {
        elements.btnImportExcel.addEventListener('click', () => elements.excelUpload.click());
        elements.excelUpload.addEventListener('change', handleExcelImport);
    }

    if (elements.btnRunSolver) elements.btnRunSolver.addEventListener('click', runSolver);
    if (elements.btnStopSolver) elements.btnStopSolver.addEventListener('click', () => stopSolver(false));

    // Dynamic constraints recalculation on input change
    [elements.limitV20, elements.limitV80, elements.limitSD20, elements.limitSD80, elements.maxLift, elements.maxLower].forEach(el => {
        if (el) el.addEventListener('change', () => {
            if (appState.stations.length > 0) {
                calculateMetrics();
                rebuildTable();
                updateChart();
            }
        });
    });

    // Search input handler
    if (elements.tableSearch) {
        elements.tableSearch.addEventListener('input', () => {
            rebuildTable();
        });
    }

    // Zoom Sliders
    if (elements.zoomHorizontalSlider) {
        elements.zoomHorizontalSlider.addEventListener('input', () => {
            updateChart();
        });
    }
    if (elements.zoomVerticalLeftSlider) {
        elements.zoomVerticalLeftSlider.addEventListener('input', () => {
            updateChart();
        });
    }

    if (elements.btnResetView) {
        elements.btnResetView.addEventListener('click', () => {
            const N = appState.stations.length;
            if (N === 0) return;
            appState.zoomCenter = Math.floor((N - 1) / 2);
            appState.yCenterOffset = 0;
            elements.zoomHorizontalSlider.value = 1;
            elements.zoomVerticalLeftSlider.value = 10;
            updateChart();
            showToast("View reset to default");
        });
    }

    if (elements.btnExportPdf) elements.btnExportPdf.addEventListener('click', exportPDF);
    if (elements.btnExportExcel) elements.btnExportExcel.addEventListener('click', exportExcel);

    // --- Chainage Helpers ---
    function parseUserChainage(str) {
        if (str === undefined || str === null) return NaN;
        str = str.toString().trim();
        if (str === '') return NaN;
        
        // Handle Slash format (500/010) or Plus format (500+010)
        if (str.includes('/') || str.includes('+')) {
            const parts = str.includes('/') ? str.split('/') : str.split('+');
            const k = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            if (isNaN(k) || isNaN(m)) return NaN;
            return k + (m / 10000);
        }
        
        // Handle decimal format (500.1100 or 500.010)
        const parts = str.split('.');
        if (parts.length === 2) {
            const k = parseInt(parts[0]);
            const mStr = parts[1];
            const m = parseInt(mStr);
            if (mStr.length >= 4) {
                return k + (m / 10000);
            }
            
            // Standard float representation: fractional part represents meters directly. E.g. 500.5 -> 500m
            const floatVal = parseFloat(str);
            const kF = Math.floor(floatVal);
            const frac = floatVal - kF;
            const meters = Math.round(frac * 1000);
            return kF + (meters / 10000);
        }
        
        return parseFloat(str);
    }

    function formatChainage(val) {
        const k = Math.floor(val);
        const m = Math.round((val - k) * 10000);
        if (m < 1000) {
            return `${k}/${m.toString().padStart(3, '0')}`;
        }
        return `${k}/${m}`;
    }

    function formatInputChainage(val) {
        const k = Math.floor(val);
        const m = Math.round((val - k) * 10000);
        if (m < 1000) {
            return `${k}.${m.toString().padStart(3, '0')}`;
        }
        return `${k}.${m}`;
    }

    // --- App Actions ---

    function generateGrid() {
        const startStr = elements.startChainage.value.trim();
        const endStr = elements.endChainage.value.trim();
        const intervalMeters = parseFloat(elements.interval.value);
        
        const startCh = parseUserChainage(startStr);
        const endCh = parseUserChainage(endStr);
        
        if (isNaN(startCh) || isNaN(endCh) || isNaN(intervalMeters) || intervalMeters <= 0) {
            alert("Please enter valid Start/End Chainages and Station Interval!");
            return;
        }
        
        if (startCh > endCh) {
            alert("Start Chainage must be less than or equal to End Chainage.");
            return;
        }
        
        appState.stations = [];
        const step = intervalMeters / 10000;
        
        let count = 0;
        for (let ch = startCh; ch <= endCh + 1e-7; ch += step) {
            appState.stations.push({
                id: 'st_' + Math.random().toString(36).substr(2, 9),
                chainage: ch,
                existingLevel: 100.0,
                proposedLevel: 100.0,
                locked: false
            });
            count++;
        }
        
        if (appState.stations.length > 0) {
            appState.stations[0].locked = true;
            appState.stations[appState.stations.length - 1].locked = true;
            appState.zoomCenter = Math.floor((appState.stations.length - 1) / 2);
            appState.yCenterOffset = 0;
            if (elements.zoomHorizontalSlider) elements.zoomHorizontalSlider.value = "1";
        }
        
        calculateMetrics();
        rebuildTable();
        updateChart();
        
        // Show sections
        elements.optimizerSection.classList.remove('hidden');
        elements.statsSection.classList.remove('hidden');
        elements.chartSection.classList.remove('hidden');
        elements.dataSection.classList.remove('hidden');
        
        showToast(`Generated grid with ${count} stations.`);
    }

    function resetApp() {
        if (!confirm("Are you sure you want to reset all data? This cannot be undone.")) return;
        
        appState.stations = [];
        appState.zoomCenter = 0;
        appState.yCenterOffset = 0;
        if (elements.zoomHorizontalSlider) elements.zoomHorizontalSlider.value = "1";
        if (profileChart) { profileChart.destroy(); profileChart = null; }
        if (liftChart) { liftChart.destroy(); liftChart = null; }
        
        elements.startChainage.value = "500.0000";
        elements.endChainage.value = "500.1000";
        elements.interval.value = "10";
        elements.maxLift.value = "50";
        elements.maxLower.value = "50";
        elements.limitV20.value = "5";
        elements.limitV80.value = "40";
        elements.limitSD20.value = "2";
        elements.limitSD80.value = "20";
        elements.tableSearch.value = "";
        
        elements.optimizerSection.classList.add('hidden');
        elements.statsSection.classList.add('hidden');
        elements.chartSection.classList.add('hidden');
        elements.dataSection.classList.add('hidden');
        
        elements.levelsTableBody.innerHTML = "";
        
        showToast("App reset successfully.");
    }

    // --- Excel Integration ---

    function downloadTemplate() {
        const headers = ["Chainage", "Existing_Level", "Proposed_Level", "Locked"];
        const sampleData = [
            { Chainage: "500.0000", Existing_Level: 100.250, Proposed_Level: "", Locked: "TRUE" },
            { Chainage: "500.0010", Existing_Level: 100.280, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0020", Existing_Level: 100.310, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0030", Existing_Level: 100.350, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0040", Existing_Level: 100.380, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0050", Existing_Level: 100.400, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0060", Existing_Level: 100.420, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0070", Existing_Level: 100.450, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0080", Existing_Level: 100.480, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0090", Existing_Level: 100.510, Proposed_Level: "", Locked: "" },
            { Chainage: "500.0100", Existing_Level: 100.530, Proposed_Level: "", Locked: "TRUE" }
        ];
        
        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rail Levels Template");
        
        const manualAoA = [
            ["RAILWAY VERTICAL ALIGNMENT SMOOTHER - USER MANUAL"],
            [""],
            ["1. COLUMNS"],
            ["   - Chainage: Enter station chainage. You can write in Km+M format (e.g. 500+010) or decimal format (e.g. 500.0010)."],
            ["   - Existing_Level: The measured rail level at this station (in meters)."],
            ["   - Proposed_Level (Optional): If you have a target design level, enter it here. Otherwise, leave blank and the auto-smoother will compute it."],
            ["   - Locked (Optional): Set to TRUE to fix this level. The auto-smoother will not change it (useful for bridges, platform walls, etc.)."],
            [""],
            ["2. INSTRUCTIONS"],
            ["   - Keep the stations at regular 10m intervals (or whichever interval is specified in the app)."],
            ["   - Ensure endpoints (first and last stations) are locked to maintain smooth transition to the existing track."]
        ];
        const wsManual = XLSX.utils.aoa_to_sheet(manualAoA);
        wsManual['!cols'] = [{ wch: 100 }];
        XLSX.utils.book_append_sheet(wb, wsManual, "Instructions");
        
        XLSX.writeFile(wb, "Railway_Alignment_Template.xlsx");
        showToast("Template downloaded.");
    }

    function handleExcelImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            processImportedData(jsonData);
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    }

    function processImportedData(jsonData) {
        if (!jsonData || jsonData.length === 0) {
            alert("No data found in the spreadsheet!");
            return;
        }
        
        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow);
        
        const chainageKey = keys.find(k => k.toLowerCase().replace(/_/g, ' ').includes('chainage') || k.toLowerCase().includes('km') || k.toLowerCase().includes('station'));
        const existKey = keys.find(k => k.toLowerCase().replace(/_/g, ' ').includes('exist') || k.toLowerCase().includes('level') || k.toLowerCase().includes('elevation'));
        const propKey = keys.find(k => k.toLowerCase().replace(/_/g, ' ').includes('proposed') || k.toLowerCase().includes('design') || k.toLowerCase().includes('prop'));
        const lockKey = keys.find(k => k.toLowerCase().includes('lock'));
        
        if (!chainageKey) {
            alert("Could not identify the Chainage column. Please check your Excel headers.");
            return;
        }
        
        appState.stations = [];
        
        jsonData.forEach((row, idx) => {
            let chVal = row[chainageKey];
            if (chVal === undefined || chVal === null || chVal === '') return;
            
            let ch = parseUserChainage(chVal);
            if (isNaN(ch)) return;
            
            let existVal = existKey ? parseFloat(row[existKey]) : NaN;
            if (isNaN(existVal)) {
                // fallback to finding any other numeric field
                const numKey = keys.find(k => k !== chainageKey && !isNaN(parseFloat(row[k])));
                if (numKey) existVal = parseFloat(row[numKey]);
            }
            
            if (isNaN(existVal)) {
                console.warn(`Row ${idx+1}: Missing existing rail level.`);
                return;
            }
            
            let propVal = propKey ? parseFloat(row[propKey]) : NaN;
            if (isNaN(propVal)) propVal = existVal;
            
            let locked = false;
            if (lockKey) {
                const val = row[lockKey];
                if (val !== undefined && val !== null) {
                    const s = val.toString().toLowerCase().trim();
                    locked = s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'locked';
                }
            }
            
            appState.stations.push({
                id: 'st_' + Math.random().toString(36).substr(2, 9),
                chainage: ch,
                existingLevel: existVal,
                proposedLevel: propVal,
                locked: locked
            });
        });
        
        if (appState.stations.length === 0) {
            alert("No valid station rows found (required columns: Chainage and Existing Level)!");
            return;
        }
        
        // Sort by chainage
        appState.stations.sort((a, b) => a.chainage - b.chainage);
        
        // Lock endpoints
        appState.stations[0].locked = true;
        appState.stations[appState.stations.length - 1].locked = true;
        
        // Set configuration inputs
        elements.startChainage.value = formatInputChainage(appState.stations[0].chainage);
        elements.endChainage.value = formatInputChainage(appState.stations[appState.stations.length - 1].chainage);
        
        if (appState.stations.length > 1) {
            const step = appState.stations[1].chainage - appState.stations[0].chainage;
            const intervalMeters = Math.round(step * 10000);
            elements.interval.value = intervalMeters;
        }
        
        appState.zoomCenter = Math.floor((appState.stations.length - 1) / 2);
        appState.yCenterOffset = 0;
        if (elements.zoomHorizontalSlider) elements.zoomHorizontalSlider.value = "1";

        calculateMetrics();
        rebuildTable();
        updateChart();
        showToast("Import successful! Data loaded.");
        
        elements.optimizerSection.classList.remove('hidden');
        elements.statsSection.classList.remove('hidden');
        elements.chartSection.classList.remove('hidden');
        elements.dataSection.classList.remove('hidden');
    }

    // --- Metrics Calculations ---

    function calculateMetrics() {
        const N = appState.stations.length;
        if (N === 0) return;
        
        const limitV20 = parseFloat(elements.limitV20.value) || 5;
        const limitV80 = parseFloat(elements.limitV80.value) || 40;
        const limitSD20 = parseFloat(elements.limitSD20.value) || 2;
        const limitSD80 = parseFloat(elements.limitSD80.value) || 20;
        
        appState.stations.forEach(st => {
            st.liftLower = (st.proposedLevel - st.existingLevel) * 1000; // in mm
            st.v20 = null;
            st.v80 = null;
            st.sd20 = null;
            st.sd80 = null;
            st.v20Violated = false;
            st.v80Violated = false;
            st.sd20Violated = false;
            st.sd80Violated = false;
        });
        
        const intervalMeters = parseFloat(elements.interval.value) || 10;
        const k20 = Math.round(10 / intervalMeters);
        const k80 = Math.round(40 / intervalMeters);
        
        // 1. Versines
        for (let i = 0; i < N; i++) {
            if (i >= k20 && i < N - k20) {
                appState.stations[i].v20 = (appState.stations[i].proposedLevel - 0.5 * (appState.stations[i - k20].proposedLevel + appState.stations[i + k20].proposedLevel)) * 1000;
                if (Math.abs(appState.stations[i].v20) > limitV20) {
                    appState.stations[i].v20Violated = true;
                }
            }
            if (i >= k80 && i < N - k80) {
                appState.stations[i].v80 = (appState.stations[i].proposedLevel - 0.5 * (appState.stations[i - k80].proposedLevel + appState.stations[i + k80].proposedLevel)) * 1000;
                if (Math.abs(appState.stations[i].v80) > limitV80) {
                    appState.stations[i].v80Violated = true;
                }
            }
        }
        
        // 2. Sliding Block Standard Deviations (200m block)
        const windowSize = Math.round(200 / intervalMeters) + 1; // 21 stations for 10m
        const blocksCount = N - windowSize + 1;
        
        const blockSD20 = [];
        const blockSD80 = [];
        
        for (let j = 0; j < blocksCount; j++) {
            const startIdx = j;
            const endIdx = j + windowSize - 1;
            
            // SD 20
            const v20Vals = [];
            for (let idx = startIdx; idx <= endIdx; idx++) {
                if (appState.stations[idx].v20 !== null) {
                    v20Vals.push(appState.stations[idx].v20);
                }
            }
            let sd20 = 0, mean20 = 0, var20 = 0;
            if (v20Vals.length > 1) {
                mean20 = v20Vals.reduce((sum, v) => sum + v, 0) / v20Vals.length;
                var20 = v20Vals.reduce((sum, v) => sum + Math.pow(v - mean20, 2), 0) / v20Vals.length;
                sd20 = Math.sqrt(var20);
            }
            blockSD20.push({ sd: sd20, mean: mean20, variance: var20, startIdx, endIdx, count: v20Vals.length });
            
            // SD 80
            const v80Vals = [];
            for (let idx = startIdx; idx <= endIdx; idx++) {
                if (appState.stations[idx].v80 !== null) {
                    v80Vals.push(appState.stations[idx].v80);
                }
            }
            let sd80 = 0, mean80 = 0, var80 = 0;
            if (v80Vals.length > 1) {
                mean80 = v80Vals.reduce((sum, v) => sum + v, 0) / v80Vals.length;
                var80 = v80Vals.reduce((sum, v) => sum + Math.pow(v - mean80, 2), 0) / v80Vals.length;
                sd80 = Math.sqrt(var80);
            }
            blockSD80.push({ sd: sd80, mean: mean80, variance: var80, startIdx, endIdx, count: v80Vals.length });
        }
        
        if (blocksCount <= 0) {
            // Entire dataset standard deviation
            const v20Vals = appState.stations.filter(st => st.v20 !== null).map(st => st.v20);
            const mean20 = v20Vals.length > 1 ? v20Vals.reduce((a,b)=>a+b,0)/v20Vals.length : 0;
            const sd20 = v20Vals.length > 1 ? Math.sqrt(v20Vals.reduce((sum, v) => sum + Math.pow(v - mean20, 2), 0) / v20Vals.length) : 0;
            
            const v80Vals = appState.stations.filter(st => st.v80 !== null).map(st => st.v80);
            const mean80 = v80Vals.length > 1 ? v80Vals.reduce((a,b)=>a+b,0)/v80Vals.length : 0;
            const sd80 = v80Vals.length > 1 ? Math.sqrt(v80Vals.reduce((sum, v) => sum + Math.pow(v - mean80, 2), 0) / v80Vals.length) : 0;
            
            appState.stations.forEach(st => {
                st.sd20 = sd20;
                st.sd80 = sd80;
                st.sd20Violated = sd20 > limitSD20;
                st.sd80Violated = sd80 > limitSD80;
                st.sd20Details = { mean: mean20, count: v20Vals.length, startIdx: 0, endIdx: N-1 };
                st.sd80Details = { mean: mean80, count: v80Vals.length, startIdx: 0, endIdx: N-1 };
            });
        } else {
            const offset = Math.floor(windowSize / 2);
            for (let i = 0; i < N; i++) {
                // Find the index of the block that is centered at station i
                let j_center = i - offset;
                
                // Clamp for the track ends (first and last 100m)
                if (j_center < 0) j_center = 0;
                if (j_center >= blocksCount) j_center = blocksCount - 1;
                
                const bestBlock20 = blockSD20[j_center];
                const bestBlock80 = blockSD80[j_center];
                
                appState.stations[i].sd20 = bestBlock20.sd;
                appState.stations[i].sd80 = bestBlock80.sd;
                appState.stations[i].sd20Violated = bestBlock20.sd > limitSD20;
                appState.stations[i].sd80Violated = bestBlock80.sd > limitSD80;
                appState.stations[i].sd20Details = bestBlock20;
                appState.stations[i].sd80Details = bestBlock80;
            }
        }
        
        updateDashboard();
    }

    function updateDashboard() {
        let maxLift = 0;
        let maxLower = 0;
        let maxV20 = 0;
        let maxV80 = 0;
        let maxSD20 = 0;
        let maxSD80 = 0;
        let anyViolations = false;
        
        const limitV20 = parseFloat(elements.limitV20.value) || 5;
        const limitV80 = parseFloat(elements.limitV80.value) || 40;
        const limitSD20 = parseFloat(elements.limitSD20.value) || 2;
        const limitSD80 = parseFloat(elements.limitSD80.value) || 20;
        
        appState.stations.forEach(st => {
            if (st.liftLower > maxLift) maxLift = st.liftLower;
            if (st.liftLower < -maxLower) maxLower = -st.liftLower;
            
            if (st.v20 !== null && Math.abs(st.v20) > maxV20) maxV20 = Math.abs(st.v20);
            if (st.v80 !== null && Math.abs(st.v80) > maxV80) maxV80 = Math.abs(st.v80);
            
            if (st.sd20 !== null && st.sd20 > maxSD20) maxSD20 = st.sd20;
            if (st.sd80 !== null && st.sd80 > maxSD80) maxSD80 = st.sd80;
            
            if (st.v20Violated || st.v80Violated || st.sd20Violated || st.sd80Violated) {
                anyViolations = true;
            }
        });
        
        elements.valMaxLift.textContent = maxLift.toFixed(1) + " mm";
        elements.valMaxLower.textContent = maxLower.toFixed(1) + " mm";
        
        elements.valMaxV20.textContent = maxV20.toFixed(1) + " mm";
        toggleViolationStyle(elements.valMaxV20, maxV20 > limitV20);
        toggleCardViolationStyle('stat-v20', maxV20 > limitV20);
        
        elements.valMaxV80.textContent = maxV80.toFixed(1) + " mm";
        toggleViolationStyle(elements.valMaxV80, maxV80 > limitV80);
        toggleCardViolationStyle('stat-v80', maxV80 > limitV80);
        
        elements.valMaxSD20.textContent = maxSD20.toFixed(1) + " mm";
        toggleViolationStyle(elements.valMaxSD20, maxSD20 > limitSD20);
        toggleCardViolationStyle('stat-sd20', maxSD20 > limitSD20);
        
        elements.valMaxSD80.textContent = maxSD80.toFixed(1) + " mm";
        toggleViolationStyle(elements.valMaxSD80, maxSD80 > limitSD80);
        toggleCardViolationStyle('stat-sd80', maxSD80 > limitSD80);
        
        if (anyViolations) {
            elements.valCompliance.textContent = "FAIL";
            elements.valCompliance.style.color = "var(--danger)";
            elements.valCompliance.parentElement.className = "stat-box fail";
        } else {
            elements.valCompliance.textContent = "PASS";
            elements.valCompliance.style.color = "var(--success)";
            elements.valCompliance.parentElement.className = "stat-box pass";
        }
    }

    function toggleViolationStyle(element, violated) {
        if (violated) {
            element.style.color = "var(--danger)";
        } else {
            element.style.color = "var(--text-main)";
        }
    }

    function toggleCardViolationStyle(cardId, violated) {
        const card = document.getElementById(cardId);
        if (!card) return;
        if (violated) {
            card.className = "stat-box fail";
        } else {
            card.className = "stat-box pass";
        }
    }

    // --- Optimization Engine (PGD Solver) ---

    function runSolver() {
        const N = appState.stations.length;
        if (N < 2) {
            alert("Please load or generate some rail levels first!");
            return;
        }
        
        // Grab solver parameters
        const maxLiftVal = isNaN(parseFloat(elements.maxLift.value)) ? 0.050 : parseFloat(elements.maxLift.value) / 1000.0;
        const maxLowerVal = isNaN(parseFloat(elements.maxLower.value)) ? 0.050 : parseFloat(elements.maxLower.value) / 1000.0;
        
        const limitV20Val = parseFloat(elements.limitV20.value) || 5.0;
        const limitV80Val = parseFloat(elements.limitV80.value) || 40.0;
        const limitSD20Val = parseFloat(elements.limitSD20.value) || 2.0;
        const limitSD80Val = parseFloat(elements.limitSD80.value) || 20.0;
        
        const intervalMetersVal = parseFloat(elements.interval.value) || 10.0;
        const smoothWeightVal = parseInt(elements.optSmoothWeight.value) || 10;
        const maxIterVal = parseInt(elements.optIterations.value) || 1000;
        
        solverState = {
            running: true,
            iteration: 0,
            maxIterations: maxIterVal,
            P: appState.stations.map(st => st.proposedLevel),
            E: appState.stations.map(st => st.existingLevel),
            locked: appState.stations.map(st => st.locked),
            m: new Array(N).fill(0),
            v: new Array(N).fill(0),
            t: 0,
            maxLift: maxLiftVal,
            maxLower: maxLowerVal,
            limitV20: limitV20Val,
            limitV80: limitV80Val,
            limitSD20: limitSD20Val,
            limitSD80: limitSD80Val,
            intervalMeters: intervalMetersVal,
            smoothWeight: smoothWeightVal
        };
        
        // Toggle Buttons
        elements.btnRunSolver.classList.add('hidden');
        elements.btnStopSolver.classList.remove('hidden');
        elements.solverProgressCard.classList.remove('hidden');
        
        executeSolverLoop();
    }

    function executeSolverLoop() {
        if (!solverState.running) return;
        
        // Run several epochs per frame
        const stepsPerFrame = 40;
        for (let s = 0; s < stepsPerFrame; s++) {
            if (solverState.iteration >= solverState.maxIterations) {
                stopSolver(true);
                return;
            }
            runSolverStep();
        }
        
        // Update UI Progress
        const percent = Math.min(100, Math.round((solverState.iteration / solverState.maxIterations) * 100));
        elements.solverProgressFill.style.width = percent + '%';
        elements.solverProgressText.textContent = `Optimizing: ${percent}% (Iter ${solverState.iteration}/${solverState.maxIterations})`;
        
        calculateMetrics();
        updateChart(true); // fast draw

        // ── Early-stopping check ─────────────────────────────────────────────
        // If all compliance checks are already satisfied, stop immediately.
        // This achieves the minimum-shift profile — no unnecessary extra lifting
        // or lowering is applied beyond what is needed for track quality.
        const allPass = appState.stations.every(st =>
            !st.v20Violated && !st.v80Violated && !st.sd20Violated && !st.sd80Violated
        );
        if (allPass && solverState.iteration > stepsPerFrame) {
            elements.solverProgressText.textContent = `✅ Converged at iteration ${solverState.iteration} — all constraints satisfied.`;
            stopSolver(true);
            showToast(`Converged in ${solverState.iteration} iterations — minimum shift profile achieved!`);
            return;
        }
        // ─────────────────────────────────────────────────────────────────────
        
        requestAnimationFrame(executeSolverLoop);
    }

    function runSolverStep() {
        const P = solverState.P;
        const E = solverState.E;
        const N = P.length;
        
        const w_dev = 1.0;
        const w_curv = 0.05 * solverState.smoothWeight; // Reduced weight to allow smooth vertical curves
        const w_jolt = 1.0 * solverState.smoothWeight;  // Increased weight to ensure smooth parabolas at crest/valley
        
        const limitV20 = solverState.limitV20;
        const limitV80 = solverState.limitV80;
        const limitSD20 = solverState.limitSD20;
        const limitSD80 = solverState.limitSD80;
        const maxLift = solverState.maxLift;
        const maxLower = solverState.maxLower;
        
        const intervalMeters = solverState.intervalMeters;
        const k20 = Math.round(10 / intervalMeters);
        const k80 = Math.round(40 / intervalMeters);
        
        const windowSize = Math.round(200 / intervalMeters) + 1;
        const blocksCount = N - windowSize + 1;
        
        const K_pen = 4000.0;
        
        const grad = new Array(N).fill(0);
        
        // 1. Lift/Lower deviation gradient (with 10x penalty for lowering to bias solver towards lifting)
        for (let i = 0; i < N; i++) {
            const diff = P[i] - E[i];
            if (diff < 0) {
                grad[i] += w_dev * 10.0 * 2 * diff;
            } else {
                grad[i] += w_dev * 2 * diff;
            }
        }
        
        // 2. Curvature (smoothness) gradient (V20 proxy in meters)
        for (let i = k20; i < N - k20; i++) {
            const c = P[i] - 0.5 * (P[i - k20] + P[i + k20]);
            grad[i] += w_curv * 2 * c;
            grad[i - k20] += w_curv * 2 * c * (-0.5);
            grad[i + k20] += w_curv * 2 * c * (-0.5);
        }
        
        // 3. Jolt (3rd derivative spline-like) gradient
        if (N > 3) {
            for (let i = 1; i < N - 2; i++) {
                const j = P[i+2] - 3*P[i+1] + 3*P[i] - P[i-1];
                grad[i-1] += w_jolt * 2 * j * (-1);
                grad[i]   += w_jolt * 2 * j * 3;
                grad[i+1] += w_jolt * 2 * j * (-3);
                grad[i+2] += w_jolt * 2 * j * 1;
            }
        }
        
        // 4. Versine limits gradients (differentiable penalty in meters)
        // V20 limit
        for (let i = k20; i < N - k20; i++) {
            const v = P[i] - 0.5 * (P[i - k20] + P[i + k20]); // in meters
            const v_mm = v * 1000.0;
            if (Math.abs(v_mm) > limitV20) {
                const diff_mm = Math.abs(v_mm) - limitV20;
                const diff_m = diff_mm / 1000.0;
                const sign = Math.sign(v_mm);
                const g_v_m = 2 * K_pen * diff_m * sign;
                grad[i] += g_v_m;
                grad[i - k20] += g_v_m * (-0.5);
                grad[i + k20] += g_v_m * (-0.5);
            }
        }
        // V80 limit
        for (let i = k80; i < N - k80; i++) {
            const v = P[i] - 0.5 * (P[i - k80] + P[i + k80]); // in meters
            const v_mm = v * 1000.0;
            if (Math.abs(v_mm) > limitV80) {
                const diff_mm = Math.abs(v_mm) - limitV80;
                const diff_m = diff_mm / 1000.0;
                const sign = Math.sign(v_mm);
                const g_v_m = 2 * K_pen * diff_m * sign;
                grad[i] += g_v_m;
                grad[i - k80] += g_v_m * (-0.5);
                grad[i + k80] += g_v_m * (-0.5);
            }
        }
        
        // 5. Sliding Block SD gradients (in meters scale)
        if (blocksCount > 0) {
            for (let j = 0; j < blocksCount; j++) {
                const startIdx = j;
                const endIdx = j + windowSize - 1;
                
                // SD 20
                const v20Vals = [];
                const v20Indices = [];
                for (let idx = startIdx; idx <= endIdx; idx++) {
                    if (idx >= k20 && idx < N - k20) {
                        const v = P[idx] - 0.5 * (P[idx - k20] + P[idx + k20]); // in meters
                        v20Vals.push(v);
                        v20Indices.push(idx);
                    }
                }
                if (v20Vals.length > 1) {
                    const mean = v20Vals.reduce((sum, v) => sum + v, 0) / v20Vals.length;
                    const variance = v20Vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / v20Vals.length;
                    const sd = Math.sqrt(variance); // in meters
                    const sd_mm = sd * 1000.0;
                    if (sd_mm > limitSD20) {
                        const limitSD20_m = limitSD20 / 1000.0;
                        const factor = (2 * K_pen / v20Vals.length) * (1 - limitSD20_m / sd);
                        for (let k = 0; k < v20Vals.length; k++) {
                            const idx = v20Indices[k];
                            const g_v_m = factor * (v20Vals[k] - mean);
                            grad[idx] += g_v_m;
                            grad[idx - k20] += g_v_m * (-0.5);
                            grad[idx + k20] += g_v_m * (-0.5);
                        }
                    }
                }
                
                // SD 80
                const v80Vals = [];
                const v80Indices = [];
                for (let idx = startIdx; idx <= endIdx; idx++) {
                    if (idx >= k80 && idx < N - k80) {
                        const v = P[idx] - 0.5 * (P[idx - k80] + P[idx + k80]); // in meters
                        v80Vals.push(v);
                        v80Indices.push(idx);
                    }
                }
                if (v80Vals.length > 1) {
                    const mean = v80Vals.reduce((sum, v) => sum + v, 0) / v80Vals.length;
                    const variance = v80Vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / v80Vals.length;
                    const sd = Math.sqrt(variance); // in meters
                    const sd_mm = sd * 1000.0;
                    if (sd_mm > limitSD80) {
                        const limitSD80_m = limitSD80 / 1000.0;
                        const factor = (2 * K_pen / v80Vals.length) * (1 - limitSD80_m / sd);
                        for (let k = 0; k < v80Vals.length; k++) {
                            const idx = v80Indices[k];
                            const g_v_m = factor * (v80Vals[k] - mean);
                            grad[idx] += g_v_m;
                            grad[idx - k80] += g_v_m * (-0.5);
                            grad[idx + k80] += g_v_m * (-0.5);
                        }
                    }
                }
            }
        }
        
        // Adam Optimizer Step with larger epsilon to prevent Sign-SGD drift
        const alpha = 0.005; // Slightly increased for faster convergence with scaled gradients
        const beta1 = 0.9;
        const beta2 = 0.999;
        const epsilon = 0.1; // Large epsilon to scale down small gradients and enforce minimum shift
        
        solverState.t += 1;
        const t = solverState.t;
        
        for (let i = 0; i < N; i++) {
            if (solverState.locked[i]) continue;
            
            solverState.m[i] = beta1 * solverState.m[i] + (1 - beta1) * grad[i];
            solverState.v[i] = beta2 * solverState.v[i] + (1 - beta2) * Math.pow(grad[i], 2);
            
            const m_hat = solverState.m[i] / (1 - Math.pow(beta1, t));
            const v_hat = solverState.v[i] / (1 - Math.pow(beta2, t));
            
            P[i] -= (alpha / (Math.sqrt(v_hat) + epsilon)) * m_hat;
            
            // Box clamp
            const minL = E[i] - maxLower;
            const maxL = E[i] + maxLift;
            P[i] = Math.max(minL, Math.min(maxL, P[i]));
        }
        
        // Hard transition locks
        P[0] = E[0];
        P[N-1] = E[N-1];
        
        // Sync
        for (let i = 0; i < N; i++) {
            appState.stations[i].proposedLevel = P[i];
        }
        
        solverState.iteration++;
    }

    function stopSolver(completed = false) {
        solverState.running = false;
        
        elements.btnRunSolver.classList.remove('hidden');
        elements.btnStopSolver.classList.add('hidden');
        elements.solverProgressCard.classList.add('hidden');
        
        calculateMetrics();
        rebuildTable();
        updateChart();
        
        if (completed) {
            showToast("Optimization finished successfully!");
        } else {
            showToast("Optimization stopped by user.", "warning");
        }
    }

    // --- Graphical Renderings ---

    function updateChart(fast = false) {
        const N = appState.stations.length;
        if (N === 0) return;
        
        const labels = appState.stations.map(st => formatChainage(st.chainage));
        const existData = appState.stations.map(st => st.existingLevel);
        const propData = appState.stations.map(st => st.proposedLevel);
        const liftData = appState.stations.map(st => st.liftLower);
        
        const liftColors = liftData.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)');
        const liftBorderColors = liftData.map(v => v >= 0 ? '#10b981' : '#ef4444');
        
        const horizZoom = parseFloat(elements.zoomHorizontalSlider.value);
        const vertZoom = parseFloat(elements.zoomVerticalLeftSlider.value);
        
        elements.valVerticalZoom.textContent = vertZoom + "x";
        
        // Calculate start and end indices centered around appState.zoomCenter
        // At zoom = 1, we show all stations
        // At zoom = 100, we show 5 to 10 stations
        const minVisible = Math.max(5, Math.min(N, 10));
        const k = (horizZoom - 1) / 99;
        const visibleCount = Math.max(minVisible, Math.round(N - k * (N - minVisible)));
        
        let startIdx = Math.round(appState.zoomCenter - visibleCount / 2);
        let endIdx = startIdx + visibleCount - 1;
        
        if (startIdx < 0) {
            startIdx = 0;
            endIdx = startIdx + visibleCount - 1;
        }
        if (endIdx >= N) {
            endIdx = N - 1;
            startIdx = Math.max(0, endIdx - visibleCount + 1);
        }
        
        // Update zoom center back to the real center of current window
        appState.zoomCenter = (startIdx + endIdx) / 2;
        
        // Find visible range levels bounds
        let visMin = Infinity;
        let visMax = -Infinity;
        for (let i = startIdx; i <= endIdx; i++) {
            if (existData[i] < visMin) visMin = existData[i];
            if (existData[i] > visMax) visMax = existData[i];
            if (propData[i] < visMin) visMin = propData[i];
            if (propData[i] > visMax) visMax = propData[i];
        }
        
        const yRange = Math.max(0.005, visMax - visMin);
        const yMid = (visMin + visMax) / 2 + appState.yCenterOffset;
        const exaggeratedSpan = yRange / (vertZoom / 5.0);
        
        const yMin = yMid - exaggeratedSpan / 2;
        const yMax = yMid + exaggeratedSpan / 2;
        
        if (profileChart && liftChart) {
            profileChart.data.labels = labels;
            profileChart.data.datasets[0].data = existData;
            profileChart.data.datasets[1].data = propData;
            
            profileChart.options.scales.x.min = labels[startIdx];
            profileChart.options.scales.x.max = labels[endIdx];
            profileChart.options.scales.y.min = yMin;
            profileChart.options.scales.y.max = yMax;
            
            liftChart.data.labels = labels;
            liftChart.data.datasets[0].data = liftData;
            liftChart.data.datasets[0].backgroundColor = liftColors;
            liftChart.data.datasets[0].borderColor = liftBorderColors;
            
            liftChart.options.scales.x.min = labels[startIdx];
            liftChart.options.scales.x.max = labels[endIdx];
            
            if (fast) {
                profileChart.update('none');
                liftChart.update('none');
            } else {
                profileChart.update();
                liftChart.update();
            }
            return;
        }
        
        // Build fresh Chart instances
        const ctxProfile = document.getElementById('profile-chart').getContext('2d');
        const ctxLift = document.getElementById('lift-chart').getContext('2d');
        
        // Register a custom tooltip positioner that follows the mouse cursor.
        // Places tooltip to the left or right depending on mouse X position.
        Chart.Tooltip.positioners.mouseFollow = function(elements, eventPosition) {
            const chartWidth = this.chart.width;
            if (eventPosition.x > chartWidth / 2) {
                // Right half: place tooltip to the left of the pointer
                return {
                    x: eventPosition.x - 15,
                    y: eventPosition.y,
                    xAlign: 'right',
                    yAlign: 'center'
                };
            } else {
                // Left half: place tooltip to the right of the pointer
                return {
                    x: eventPosition.x + 15,
                    y: eventPosition.y,
                    xAlign: 'left',
                    yAlign: 'center'
                };
            }
        };

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: { color: '#f8fafc', font: { family: 'Outfit', size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleFont: { family: 'Outfit', weight: 'bold', size: 13 },
                    bodyFont: { family: 'Outfit', size: 12 },
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const st = appState.stations[index];
                            if (!st) return '';
                            return `Station No. ${index + 1} | Chainage ${formatChainage(st.chainage)}`;
                        },
                        label: function(context) {
                            const index = context.dataIndex;
                            const st = appState.stations[index];
                            if (!st) return '';
                            if (context.chart.canvas.id === 'lift-chart') {
                                const liftText = st.liftLower >= 0 ? `+${st.liftLower.toFixed(1)}` : st.liftLower.toFixed(1);
                                return `Lift/Lower: ${liftText} mm`;
                            }
                            if (context.datasetIndex === 0) {
                                return `Existing Level: ${st.existingLevel.toFixed(3)} m`;
                            } else {
                                return `Proposed Level: ${st.proposedLevel.toFixed(3)} m`;
                            }
                        },
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const st = appState.stations[index];
                            if (!st) return [];

                            // Profile chart: show only lift/lower — keep tooltip compact
                            if (context[0].chart.canvas.id === 'profile-chart') {
                                const liftText = st.liftLower >= 0
                                    ? `+${st.liftLower.toFixed(1)} mm`
                                    : `${st.liftLower.toFixed(1)} mm`;
                                return [`Lift/Lower: ${liftText}`];
                            }

                            // Lift/lower bar chart: show full engineering detail
                            const getVal = (idx, proposed) => proposed ? appState.stations[idx].proposedLevel : appState.stations[idx].existingLevel;
                            const intervalMeters = parseFloat(elements.interval.value) || 10;

                            function formatGrad(g) {
                                if (g === null || Math.abs(g) < 1e-7) return "0.000% (Flat)";
                                const pct = (g * 100).toFixed(3);
                                const ratioVal = Math.round(1 / Math.abs(g));
                                return `${g > 0 ? "+" : ""}${pct}% (1 in ${ratioVal})`;
                            }

                            let existIn = "N/A", existOut = "N/A";
                            let propIn = "N/A", propOut = "N/A";

                            if (index > 0) {
                                existIn = formatGrad((getVal(index, false) - getVal(index - 1, false)) / intervalMeters);
                                propIn = formatGrad((getVal(index, true) - getVal(index - 1, true)) / intervalMeters);
                            }
                            if (index < appState.stations.length - 1) {
                                existOut = formatGrad((getVal(index + 1, false) - getVal(index, false)) / intervalMeters);
                                propOut = formatGrad((getVal(index + 1, true) - getVal(index, true)) / intervalMeters);
                            }

                            const v20Text = st.v20 !== null ? `${st.v20.toFixed(1)} mm${st.v20Violated ? ' ❌' : ' ✓'}` : '-';
                            const v80Text = st.v80 !== null ? `${st.v80.toFixed(1)} mm${st.v80Violated ? ' ❌' : ' ✓'}` : '-';
                            const sd20Text = st.sd20 !== null ? `${st.sd20.toFixed(1)} mm${st.sd20Violated ? ' ❌' : ' ✓'}` : '-';
                            const sd80Text = st.sd80 !== null ? `${st.sd80.toFixed(1)} mm${st.sd80Violated ? ' ❌' : ' ✓'}` : '-';

                            const violated = st.v20Violated || st.v80Violated || st.sd20Violated || st.sd80Violated;
                            const statusText = violated ? "⛔ FAIL" : "✅ PASS";

                            return [
                                `──────────────────────────`,
                                `Existing Gradient:`,
                                `  In: ${existIn}`,
                                `  Out: ${existOut}`,
                                `Proposed Gradient:`,
                                `  In: ${propIn}`,
                                `  Out: ${propOut}`,
                                `──────────────────────────`,
                                `20m Versine: ${v20Text} (Lim: ${elements.limitV20.value}mm)`,
                                `80m Versine: ${v80Text} (Lim: ${elements.limitV80.value}mm)`,
                                `20m SD:      ${sd20Text} (Lim: ${elements.limitSD20.value}mm)`,
                                `80m SD:      ${sd80Text} (Lim: ${elements.limitSD80.value}mm)`,
                                `──────────────────────────`,
                                `Status: ${statusText}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
                }
            }
        };
        
        profileChart = new Chart(ctxProfile, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Existing Rail Level (m)',
                        data: existData,
                        borderColor: '#ef4444', // Red
                        borderWidth: 1.5, // Same thickness as proposed
                        pointRadius: 0, // No node dots for cleaner look
                        pointHoverRadius: 5, // Show node only on hover
                        pointHitRadius: 15, // Increase hover detection area so it triggers easily
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Proposed Rail Level (m)',
                        data: propData,
                        borderColor: '#3b82f6', // Blue
                        borderWidth: 1.5, // Thinner
                        pointRadius: 0, // No node dots for cleaner look
                        pointHoverRadius: 5, // Show node only on hover
                        pointHitRadius: 15, // Increase hover detection area
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                ...baseOptions,
                scales: {
                    x: {
                        ...baseOptions.scales.x,
                        min: labels[startIdx],
                        max: labels[endIdx]
                    },
                    y: {
                        ...baseOptions.scales.y,
                        min: yMin,
                        max: yMax,
                        title: { display: true, text: 'Level (m)', color: '#94a3b8', font: { family: 'Outfit' } }
                    }
                }
            }
        });
        
        liftChart = new Chart(ctxLift, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Lift (+) / Lower (-) (mm)',
                        data: liftData,
                        backgroundColor: liftColors,
                        borderColor: liftBorderColors,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                ...baseOptions,
                plugins: {
                    ...baseOptions.plugins,
                    tooltip: {
                        ...baseOptions.plugins.tooltip,
                        position: 'mouseFollow'  // tooltip follows mouse vertically — doesn't block bars
                    }
                },
                scales: {
                    x: {
                        ...baseOptions.scales.x,
                        min: labels[startIdx],
                        max: labels[endIdx]
                    },
                    y: {
                        ...baseOptions.scales.y,
                        title: { display: true, text: 'Lift/Lower (mm)', color: '#94a3b8', font: { family: 'Outfit' } }
                    }
                }
            }
        });

        // Initialize canvas mouse interaction handlers
        setupCanvasInteractions(document.getElementById('profile-chart'), () => profileChart);
        setupCanvasInteractions(document.getElementById('lift-chart'), () => liftChart);
    }

    // --- Interactive Mouse Zoom & Pan Handlers ---
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartCenterIdx = 0;
    let dragStartYOffset = 0;
    let activeCanvas = null;

    function setupCanvasInteractions(canvas, chartGetter) {
        canvas.addEventListener('mousedown', (e) => {
            if (appState.stations.length === 0) return;
            isDragging = true;
            activeCanvas = canvas;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragStartCenterIdx = appState.zoomCenter;
            dragStartYOffset = appState.yCenterOffset;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging || activeCanvas !== canvas) return;
            const chart = chartGetter();
            if (!chart) return;

            const N = appState.stations.length;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;

            // Horizontal panning
            const chartWidth = chart.chartArea.right - chart.chartArea.left;
            
            // Get visible count
            const horizZoom = parseFloat(elements.zoomHorizontalSlider.value);
            const minVisible = Math.max(5, Math.min(N, 10));
            const k = (horizZoom - 1) / 99;
            const visibleCount = Math.max(minVisible, Math.round(N - k * (N - minVisible)));

            if (chartWidth > 0) {
                const indexDelta = (dx / chartWidth) * visibleCount;
                appState.zoomCenter = Math.max(0, Math.min(N - 1, dragStartCenterIdx - indexDelta));
            }

            // Vertical panning (only for profile chart y-axis)
            if (canvas.id === 'profile-chart') {
                const chartHeight = chart.chartArea.bottom - chart.chartArea.top;
                if (chartHeight > 0) {
                    const yMinLimit = chart.scales.y.min;
                    const yMaxLimit = chart.scales.y.max;
                    const ySpan = yMaxLimit - yMinLimit;
                    const meterDelta = (dy / chartHeight) * ySpan;
                    appState.yCenterOffset = dragStartYOffset + meterDelta;
                }
            }

            updateChart(true); // fast update
        });

        // Note: Mouse wheel scrolls the page normally. Use the horizontal/vertical sliders to zoom.


        canvas.addEventListener('dblclick', () => {
            const N = appState.stations.length;
            if (N === 0) return;
            appState.zoomCenter = Math.floor((N - 1) / 2);
            appState.yCenterOffset = 0;
            elements.zoomHorizontalSlider.value = 1;
            updateChart();
            showToast("View reset to default");
        });
    }

    // Global mouseup window-level listener to release drag
    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (activeCanvas) {
                activeCanvas.style.cursor = 'grab';
            }
            activeCanvas = null;
            updateChart(); // Full update on mouse release
        }
    });

    // --- Table Builder ---

    function rebuildTable() {
        const tbody = elements.levelsTableBody;
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const limitV20 = parseFloat(elements.limitV20.value) || 5;
        const limitV80 = parseFloat(elements.limitV80.value) || 40;
        const limitSD20 = parseFloat(elements.limitSD20.value) || 2;
        const limitSD80 = parseFloat(elements.limitSD80.value) || 20;
        
        const query = elements.tableSearch.value.toLowerCase().trim();
        
        appState.stations.forEach((st, idx) => {
            const chDisplay = formatChainage(st.chainage);
            if (query && !chDisplay.toLowerCase().includes(query)) return;
            
            const tr = document.createElement('tr');
            if (st.v20Violated || st.v80Violated || st.sd20Violated || st.sd80Violated) {
                tr.className = "row-violated";
            }
            
            // 1. Lock
            const tdLock = document.createElement('td');
            tdLock.style.textAlign = "center";
            const chkLock = document.createElement('input');
            chkLock.type = "checkbox";
            chkLock.checked = st.locked;
            if (idx === 0 || idx === appState.stations.length - 1) {
                chkLock.disabled = true;
            }
            chkLock.onchange = (e) => {
                st.locked = e.target.checked;
                calculateMetrics();
                updateChart();
            };
            tdLock.appendChild(chkLock);
            tr.appendChild(tdLock);
            
            // 2. Station No
            const tdNo = document.createElement('td');
            tdNo.style.textAlign = "center";
            tdNo.textContent = idx + 1;
            tr.appendChild(tdNo);
            
            // 3. Chainage
            const tdCh = document.createElement('td');
            tdCh.style.fontWeight = "bold";
            tdCh.textContent = chDisplay;
            tr.appendChild(tdCh);
            
            // 4. Existing Level
            const tdExist = document.createElement('td');
            tdExist.textContent = st.existingLevel.toFixed(3);
            tr.appendChild(tdExist);
            
            // 5. Proposed Level (Input)
            const tdProp = document.createElement('td');
            const inputProp = document.createElement('input');
            inputProp.type = "number";
            inputProp.step = "0.001";
            inputProp.className = "table-input";
            inputProp.value = st.proposedLevel.toFixed(3);
            inputProp.onchange = (e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val)) val = st.existingLevel;
                st.proposedLevel = val;
                
                calculateMetrics();
                updateChart();
                rebuildTable();
            };
            tdProp.appendChild(inputProp);
            tr.appendChild(tdProp);
            
            // 6. Lift/Lower
            const tdLift = document.createElement('td');
            const val = st.liftLower;
            if (val > 0.05) {
                tdLift.textContent = "+" + val.toFixed(1);
                tdLift.className = "lift-cell";
            } else if (val < -0.05) {
                tdLift.textContent = val.toFixed(1);
                tdLift.className = "lower-cell";
            } else {
                tdLift.textContent = "0.0";
            }
            tr.appendChild(tdLift);
            
            // Determine k values for chords
            const intervalMeters = parseFloat(elements.interval.value) || 10;
            const k20 = Math.round(10 / intervalMeters);
            const k80 = Math.round(40 / intervalMeters);
            
            // Helper for custom tooltips
            function attachTooltip(el, html) {
                el.addEventListener('mouseenter', () => {
                    const t = document.getElementById('custom-table-tooltip');
                    t.innerHTML = html;
                    t.classList.add('visible');
                });
                el.addEventListener('mousemove', (e) => {
                    const t = document.getElementById('custom-table-tooltip');
                    // Get viewport dimensions
                    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
                    
                    let left = e.clientX + 15;
                    let top = e.clientY + 15;
                    
                    // Adjust if going off screen
                    if (left + 350 > vw) {
                        left = e.clientX - 365;
                    }
                    if (top + 200 > vh) {
                        top = e.clientY - 215;
                    }
                    
                    t.style.left = left + 'px';
                    t.style.top = top + 'px';
                });
                el.addEventListener('mouseleave', () => {
                    const t = document.getElementById('custom-table-tooltip');
                    t.classList.remove('visible');
                });
            }

            // 7. V20
            const tdV20 = document.createElement('td');
            if (st.v20 !== null) {
                tdV20.textContent = st.v20.toFixed(1);
                tdV20.className = st.v20Violated ? "cell-violated" : "cell-success";
                const pMid = st.proposedLevel.toFixed(3);
                const pLeft = appState.stations[idx - k20].proposedLevel.toFixed(3);
                const pRight = appState.stations[idx + k20].proposedLevel.toFixed(3);
                const chordAvg = ((parseFloat(pLeft) + parseFloat(pRight)) / 2).toFixed(3);
                
                const calcHtml = `
                    <h4>20m Versine</h4>
                    <div class="calc-step">Formula: P_mid - (P_left + P_right) / 2</div>
                    <div class="calc-step">= ${pMid} - (${pLeft} + ${pRight}) / 2</div>
                    <div class="calc-step">= ${pMid} - ${chordAvg}</div>
                    <div class="calc-result ${st.v20Violated ? 'calc-fail' : ''}">= ${st.v20.toFixed(3)} mm</div>
                `;
                attachTooltip(tdV20, calcHtml);
            } else {
                tdV20.textContent = "-";
            }
            tr.appendChild(tdV20);
            
            // 8. V80
            const tdV80 = document.createElement('td');
            if (st.v80 !== null) {
                tdV80.textContent = st.v80.toFixed(1);
                tdV80.className = st.v80Violated ? "cell-violated" : "cell-success";
                const pMid = st.proposedLevel.toFixed(3);
                const pLeft = appState.stations[idx - k80].proposedLevel.toFixed(3);
                const pRight = appState.stations[idx + k80].proposedLevel.toFixed(3);
                const chordAvg = ((parseFloat(pLeft) + parseFloat(pRight)) / 2).toFixed(3);
                
                const calcHtml = `
                    <h4>80m Versine</h4>
                    <div class="calc-step">Formula: P_mid - (P_left + P_right) / 2</div>
                    <div class="calc-step">= ${pMid} - (${pLeft} + ${pRight}) / 2</div>
                    <div class="calc-step">= ${pMid} - ${chordAvg}</div>
                    <div class="calc-result ${st.v80Violated ? 'calc-fail' : ''}">= ${st.v80.toFixed(3)} mm</div>
                `;
                attachTooltip(tdV80, calcHtml);
            } else {
                tdV80.textContent = "-";
            }
            tr.appendChild(tdV80);
            
            // Helper for SD
            function buildSdHtml(label, stVal, violated, details, interval) {
                if (!details) return `<h4>${label}</h4><div class="calc-step">Not enough data to calculate SD block details.</div>`;
                const startCh = formatChainage(appState.stations[details.startIdx].chainage);
                const endCh = formatChainage(appState.stations[details.endIdx].chainage);
                
                return `
                    <h4>${label}</h4>
                    <div class="calc-step">Centered Block: ${startCh} to ${endCh}</div>
                    <div class="calc-step">Items in Block (N): ${details.count}</div>
                    <div class="calc-step">Mean (μ): ${details.mean.toFixed(3)} mm</div>
                    <div class="calc-step">Variance (σ²): ${details.variance.toFixed(3)}</div>
                    <div class="calc-step">Equation: &radic;[ &Sigma;(x - μ)&sup2; / N ]</div>
                    <div class="calc-result ${violated ? 'calc-fail' : ''}">SD: ${stVal.toFixed(3)} mm</div>
                `;
            }
            
            // 9. SD20
            const tdSD20 = document.createElement('td');
            if (st.sd20 !== null) {
                tdSD20.textContent = st.sd20.toFixed(1);
                tdSD20.className = st.sd20Violated ? "cell-violated" : "cell-success";
                attachTooltip(tdSD20, buildSdHtml("20m Standard Deviation", st.sd20, st.sd20Violated, st.sd20Details, intervalMeters));
            } else {
                tdSD20.textContent = "-";
            }
            tr.appendChild(tdSD20);
            
            // 10. SD80
            const tdSD80 = document.createElement('td');
            if (st.sd80 !== null) {
                tdSD80.textContent = st.sd80.toFixed(1);
                tdSD80.className = st.sd80Violated ? "cell-violated" : "cell-success";
                attachTooltip(tdSD80, buildSdHtml("80m Standard Deviation", st.sd80, st.sd80Violated, st.sd80Details, intervalMeters));
            } else {
                tdSD80.textContent = "-";
            }
            tr.appendChild(tdSD80);
            
            tbody.appendChild(tr);
        });
    }

    // --- Excel Report Export ---

    function exportExcel() {
        if (appState.stations.length === 0) {
            alert("No data available to export!");
            return;
        }
        
        // Sheet 1: Title & Project details
        const detailsData = [
            ["PARAMETER", "DETAILS"],
            ["Zone", elements.projZone.value || "-"],
            ["Division", elements.projDivision.value || "-"],
            ["PWAY Section", elements.projPway.value || "-"],
            ["Block Section", elements.projBlock.value || "-"],
            ["Line/Track", elements.projLine.value || "-"],
            ["Km Range", elements.projKm.value || "-"],
            ["LOA No", elements.projLoa.value || "-"]
        ];
        const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
        wsDetails['!cols'] = [{ wch: 25 }, { wch: 35 }];
        
        // Sheet 2: Station Level Book
        const tableHeaders = [
            "Station No", "Chainage", "Existing Level (m)", "Proposed Level (m)",
            "Lift(+)/Lower(-) (mm)", "20m Versine (mm)", "80m Versine (mm)",
            "20m Block SD (mm)", "80m Block SD (mm)", "Compliance Status"
        ];
        
        const tableData = appState.stations.map((st, idx) => {
            const violated = st.v20Violated || st.v80Violated || st.sd20Violated || st.sd80Violated;
            const liftText = st.liftLower >= 0 ? `+${st.liftLower.toFixed(1)}` : st.liftLower.toFixed(1);
            return [
                idx + 1,
                formatChainage(st.chainage),
                st.existingLevel,
                st.proposedLevel,
                liftText,
                st.v20 !== null ? st.v20.toFixed(1) : "-",
                st.v80 !== null ? st.v80.toFixed(1) : "-",
                st.sd20 !== null ? st.sd20.toFixed(1) : "-",
                st.sd80 !== null ? st.sd80.toFixed(1) : "-",
                violated ? "FAIL" : "PASS"
            ];
        });
        
        const wsTable = XLSX.utils.aoa_to_sheet([tableHeaders, ...tableData]);
        wsTable['!cols'] = [
            { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
            { wch: 22 }, { wch: 18 }, { wch: 18 },
            { wch: 18 }, { wch: 18 }, { wch: 18 }
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsDetails, "Project Info");
        XLSX.utils.book_append_sheet(wb, wsTable, "Level Book");
        
        const startCh = appState.stations[0].chainage;
        const endCh = appState.stations[appState.stations.length - 1].chainage;
        const filename = `LevelBook_Ch${startCh.toFixed(3)}_to_${endCh.toFixed(3)}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        showToast("Excel Report exported successfully.");
    }

    // --- PDF Report Export ---

    async function exportPDF() {
        if (appState.stations.length === 0) {
            alert("No data available to export!");
            return;
        }
        
        elements.btnExportPdf.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
        elements.btnExportPdf.disabled = true;
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait' });
            
            // Cover Page Header
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59);
            doc.text("Railway Line Vertical Profile Level Book", 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            doc.text(`Generated on: ${dateStr}`, 14, 28);
            
            // Project Details Table
            const details = [
                ["Zone", elements.projZone.value || "-"],
                ["Division", elements.projDivision.value || "-"],
                ["PWAY Section", elements.projPway.value || "-"],
                ["Block Section", elements.projBlock.value || "-"],
                ["Line/Track", elements.projLine.value || "-"],
                ["Km Range", elements.projKm.value || "-"],
                ["LOA No", elements.projLoa.value || "-"]
            ];
            
            doc.autoTable({
                startY: 33,
                head: [['Parameter', 'Project Specifications']],
                body: details,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246], fontSize: 10, textColor: 255 },
                styles: { fontSize: 9, cellPadding: 2.5 },
                columnStyles: { 0: { fontStyle: 'bold', width: 45 } }
            });
            
            // Statistics Summary
            let lastY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text("Summary of Profile Quality", 14, lastY);
            
            let maxLiftVal = 0, maxLowerVal = 0;
            let maxV20Val = 0, maxV80Val = 0;
            let maxSD20Val = 0, maxSD80Val = 0;
            let compliantCount = 0;
            
            appState.stations.forEach(st => {
                if (st.liftLower > maxLiftVal) maxLiftVal = st.liftLower;
                if (st.liftLower < -maxLowerVal) maxLowerVal = -st.liftLower;
                if (st.v20 !== null && Math.abs(st.v20) > maxV20Val) maxV20Val = Math.abs(st.v20);
                if (st.v80 !== null && Math.abs(st.v80) > maxV80Val) maxV80Val = Math.abs(st.v80);
                if (st.sd20 !== null && st.sd20 > maxSD20Val) maxSD20Val = st.sd20;
                if (st.sd80 !== null && st.sd80 > maxSD80Val) maxSD80Val = st.sd80;
                
                const violated = st.v20Violated || st.v80Violated || st.sd20Violated || st.sd80Violated;
                if (!violated) compliantCount++;
            });
            
            const pctCompliant = ((compliantCount / appState.stations.length) * 100).toFixed(1);
            
            const stats = [
                ["Compliance Rate", `${pctCompliant}% (${compliantCount}/${appState.stations.length} stations)`],
                ["Max Track Lift Achieved", `${maxLiftVal.toFixed(1)} mm`],
                ["Max Track Lowering Achieved", `${maxLowerVal.toFixed(1)} mm`],
                ["Max 20m Chord Versine", `${maxV20Val.toFixed(1)} mm (Limit: ${elements.limitV20.value}mm)`],
                ["Max 80m Chord Versine", `${maxV80Val.toFixed(1)} mm (Limit: ${elements.limitV80.value}mm)`],
                ["Max 20m Block SD", `${maxSD20Val.toFixed(1)} mm (Limit: ${elements.limitSD20.value}mm)`],
                ["Max 80m Block SD", `${maxSD80Val.toFixed(1)} mm (Limit: ${elements.limitSD80.value}mm)`]
            ];
            
            doc.autoTable({
                startY: lastY + 4,
                body: stats,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', width: 70 } }
            });
            
            // Station-wise detailed levels book
            doc.addPage();
            doc.setFontSize(16);
            doc.text("Station-Wise Detailed Level Book", 14, 18);
            
            const headers = [
                ["No.", "Chainage", "Exist. (m)", "Proposed (m)", "Lift/Lower (mm)", "V20 (mm)", "V80 (mm)", "SD20 (mm)", "SD80 (mm)", "Status"]
            ];
            
            const bodyData = appState.stations.map((st, idx) => {
                const liftText = st.liftLower >= 0 ? `+${st.liftLower.toFixed(1)}` : st.liftLower.toFixed(1);
                const violated = st.v20Violated || st.v80Violated || st.sd20Violated || st.sd80Violated;
                return [
                    idx + 1,
                    formatChainage(st.chainage),
                    st.existingLevel.toFixed(3),
                    st.proposedLevel.toFixed(3),
                    liftText,
                    st.v20 !== null ? st.v20.toFixed(1) : "-",
                    st.v80 !== null ? st.v80.toFixed(1) : "-",
                    st.sd20 !== null ? st.sd20.toFixed(1) : "-",
                    st.sd80 !== null ? st.sd80.toFixed(1) : "-",
                    violated ? "FAIL" : "PASS"
                ];
            });
            
            doc.autoTable({
                startY: 23,
                head: headers,
                body: bodyData,
                theme: 'grid',
                headStyles: { fillColor: [40, 50, 60], fontSize: 8, textColor: 255 },
                styles: { fontSize: 8, cellPadding: 2 },
                didDrawCell: function (data) {
                    // Highlight failing cells
                    if (data.column.index === 9 && data.cell.text[0] === 'FAIL') {
                        doc.setTextColor(220, 38, 38);
                        doc.setFont(undefined, 'bold');
                    }
                }
            });
            
            // Save PDF using Electron API dialog
            const pdfBuffer = doc.output('arraybuffer');
            const startCh = appState.stations[0].chainage;
            const endCh = appState.stations[appState.stations.length - 1].chainage;
            const defaultFilename = `LevelBook_Ch${startCh.toFixed(3)}_to_${endCh.toFixed(3)}.pdf`;
            
            if (window.electronAPI && window.electronAPI.savePDF) {
                const res = await window.electronAPI.savePDF(pdfBuffer, defaultFilename);
                if (res.success) {
                    showToast("PDF report saved successfully to: " + res.path);
                } else if (res.error !== "User canceled save") {
                    alert("Error saving PDF: " + res.error);
                }
            } else {
                doc.save(defaultFilename);
                showToast("PDF report saved.");
            }
            
        } catch (e) {
            console.error("PDF Export Error:", e);
            alert("Failed to export PDF: " + e.message);
        }
        
        elements.btnExportPdf.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Export PDF Report';
        elements.btnExportPdf.disabled = false;
    }
});
