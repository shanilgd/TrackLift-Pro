document.addEventListener('DOMContentLoaded', () => {
    // Check if running in Electron and fetch version
    if (window.electronAPI) {
        window.electronAPI.getVersion().then(version => {
            const el = document.getElementById('app-version');
            if (el) el.textContent = `v${version}`;
        });
    }

    // === DOM Elements ===
    const elements = {
        startChainage: document.getElementById('start-chainage'),
        endChainage: document.getElementById('end-chainage'),
        interval: document.getElementById('interval'),
        outInterval: document.getElementById('out-interval'),
        btnGenerate: document.getElementById('btn-generate'),
        btnCalculate: document.getElementById('btn-calculate'),
        btnExport: document.getElementById('btn-export'),
        btnTemplate: document.getElementById('btn-template'),
        dataSection: document.getElementById('data-section'),
        resultsSection: document.getElementById('results-section'),
        levelsTable: document.getElementById('levels-table'),
        resultsTable: document.getElementById('results-table'),
        btnExportPdf: document.getElementById('btn-export-pdf'),
        btnBackToConfig: document.getElementById('btn-back-to-config'),
        btnReset: document.getElementById('btn-reset'),
        chartCanvas: document.getElementById('profile-chart'),
        chartScale: document.getElementById('chart-scale'),
        btnChartPrev: document.getElementById('btn-chart-prev'),
        btnChartNext: document.getElementById('btn-chart-next'),
        chartRangeLabel: document.getElementById('chart-range-label'),
        statRadius: document.getElementById('stat-radius'),
        statMaxLift: document.getElementById('stat-max-lift'),
        statTotalLift: document.getElementById('stat-total-lift'),
        // Auto-Update
        btnCheckUpdates: document.getElementById('btn-check-updates'),
        updateModal: document.getElementById('update-modal'),
        updateVersionText: document.getElementById('update-version-text'),
        btnUpdateDownload: document.getElementById('btn-update-download'),
        btnUpdateCancel: document.getElementById('btn-update-cancel'),
        updateActionContainer: document.getElementById('update-action-container'),
        updateProgressContainer: document.getElementById('update-progress-container'),
        updateProgressText: document.getElementById('update-progress-text'),
        updateProgressFill: document.getElementById('update-progress-fill'),
        updateInstallContainer: document.getElementById('update-install-container'),
        btnUpdateInstall: document.getElementById('btn-update-install'),
        // Credits
        btnCredits: document.getElementById('btn-credits'),
        creditsModal: document.getElementById('credits-modal'),
        closeCredits: document.getElementById('close-credits'),
    };

    let appState = {
        nodes: [], // 20m nodes
        results4m: [], // 4m interpolated results
        profileChart: null,
        chartChunkIndex: 0,
        kmLengths: {}, // { "100": 1000, "101": 980 }
        remarks: {} // Keyed by chainage
    };

    // === Initialization ===
    if (elements.btnCheckUpdates) {
        elements.btnCheckUpdates.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.checkForUpdates) {
                window.electronAPI.checkForUpdates();
                elements.btnCheckUpdates.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
                elements.btnCheckUpdates.disabled = true;
                setTimeout(() => {
                    elements.btnCheckUpdates.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Updates';
                    elements.btnCheckUpdates.disabled = false;
                }, 3000);
            } else {
                showToast("Updater is unavailable.");
            }
        });
    }

    // Credits modal
    elements.btnCredits.addEventListener('click', () => elements.creditsModal.classList.remove('hidden'));
    elements.closeCredits.addEventListener('click', () => elements.creditsModal.classList.add('hidden'));

    elements.btnGenerate.addEventListener('click', generateGrid);
    elements.btnCalculate.addEventListener('click', calculateProfile);
    elements.btnExport.addEventListener('click', exportExcel);
    if (elements.btnTemplate) elements.btnTemplate.addEventListener('click', downloadTemplate);
    if (elements.btnExportPdf) elements.btnExportPdf.addEventListener('click', exportPDF);
    elements.btnReset.addEventListener('click', resetApp);
    
    if (elements.btnBackToConfig) {
        elements.btnBackToConfig.addEventListener('click', () => {
            elements.dataSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Chart scale controls
    if (elements.chartScale) {
        elements.chartScale.addEventListener('change', () => {
            appState.chartChunkIndex = 0;
            renderChart();
        });
        elements.btnChartPrev.addEventListener('click', () => {
            if (appState.chartChunkIndex > 0) {
                appState.chartChunkIndex--;
                renderChart();
            }
        });
        elements.btnChartNext.addEventListener('click', () => {
            appState.chartChunkIndex++;
            renderChart();
        });
    }

    // Dynamic inputs
    elements.levelsTable.addEventListener('input', (e) => {
        if (e.target.dataset.type === 'kmlen') {
            const ch = parseFloat(e.target.dataset.chainage);
            const km = Math.floor(ch);
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) {
                appState.kmLengths[km] = val;
            } else {
                delete appState.kmLengths[km];
            }
        }
    });

    // Excel Import
    const btnImport = document.getElementById('btn-import-excel');
    const fileInput = document.getElementById('excel-upload');
    if (btnImport && fileInput) {
        btnImport.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleExcelImport);
    }

    // === Core Logic ===

    const parseUserChainage = (str) => {
        if (!str) return NaN;
        str = str.toString().trim();
        if (str.includes('/')) {
            const parts = str.split('/');
            const k = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            if (isNaN(k) || isNaN(m)) return NaN;
            return k + (m / 10000);
        }
        if (str.includes('.')) {
            const parts = str.split('.');
            const k = parseInt(parts[0]);
            const mStr = parts[1];
            if (isNaN(k) || !mStr) return NaN;

            // Normalize meter string to always represent exact meter value:
            // "480" → 480m, "48" → 480m (pad right to 3 digits), "4" → 400m
            // i.e. treat decimal part as left-justified 3-digit meters
            const mPadded = mStr.substring(0, 3).padEnd(3, '0');
            const m = parseInt(mPadded);
            return k + (m / 10000);
        }
        return parseFloat(str);
    };

    function formatChainage(c) {
        const k = Math.floor(c);
        const m = Math.round((c - k) * 10000);
        return `${k}/${m.toString().padStart(3, '0')}`;
    }

    function generateGrid() {
        const start = parseUserChainage(elements.startChainage.value);
        const end = parseUserChainage(elements.endChainage.value);
        const intMeters = parseFloat(elements.interval.value) || 20;

        if (isNaN(start) || isNaN(end) || start > end) {
            showToast("Invalid chainage configuration.");
            return;
        }

        appState.nodes = [];

        // Use integer step index to avoid floating-point drift over long stretches
        const startKm = Math.floor(start);
        const startM  = Math.round((start - startKm) * 10000);
        const endKm   = Math.floor(end);
        const endM    = Math.round((end - endKm) * 10000);
        const startTotalM = startKm * 1000 + startM; // total meters from km 0 (approx, uniform km)
        const endTotalM   = endKm * 1000 + endM;

        let stepIdx = 0;
        while (true) {
            const totalM = startTotalM + stepIdx * intMeters;
            if (totalM > endTotalM + 0.001) break;

            const km = Math.floor(totalM / 1000);
            const m  = totalM % 1000;
            const c  = km + m / 10000;

            appState.nodes.push({
                chainage: c,
                existing: 100.000,
                proposed: 100.000,
                obligatory: false,
                remark: ""
            });
            stepIdx++;
        }

        rebuildInputUI();
    }

    function rebuildInputUI() {
        const tbody = elements.levelsTable.querySelector('tbody');
        tbody.innerHTML = '';

        appState.nodes.forEach((node, idx) => {
            const tr = document.createElement('tr');
            
            // Chainage
            const tdCh = document.createElement('td');
            const inCh = document.createElement('input');
            inCh.type = 'text';
            inCh.value = formatChainage(node.chainage);
            inCh.className = 'input-chainage';
            inCh.style.width = '90px';
            inCh.style.fontWeight = 'bold';
            tdCh.appendChild(inCh);
            tr.appendChild(tdCh);

            // Existing Level
            const tdEx = document.createElement('td');
            const inEx = document.createElement('input');
            inEx.type = 'number';
            inEx.step = '0.001';
            inEx.value = node.existing.toFixed(3);
            inEx.dataset.idx = idx;
            inEx.className = 'input-existing';
            inEx.style.width = '100px';
            tdEx.appendChild(inEx);
            tr.appendChild(tdEx);

            // Km Length
            const tdKm = document.createElement('td');
            const inKm = document.createElement('input');
            inKm.type = 'number';
            inKm.placeholder = '1000';
            inKm.dataset.type = 'kmlen';
            inKm.dataset.chainage = node.chainage;
            inKm.style.width = '80px';
            const kmIdx = Math.floor(node.chainage);
            if (idx === 0 && appState.kmLengths[kmIdx]) {
                inKm.value = appState.kmLengths[kmIdx];
            }
            tdKm.appendChild(inKm);
            tr.appendChild(tdKm);

            // Obligatory
            const tdObl = document.createElement('td');
            tdObl.style.textAlign = 'center';
            const inObl = document.createElement('input');
            inObl.type = 'checkbox';
            inObl.checked = node.obligatory;
            inObl.dataset.idx = idx;
            inObl.className = 'input-obligatory';
            tdObl.appendChild(inObl);
            tr.appendChild(tdObl);

            // Remarks
            const tdRem = document.createElement('td');
            const inRem = document.createElement('input');
            inRem.type = 'text';
            inRem.value = node.remark;
            inRem.dataset.idx = idx;
            inRem.className = 'input-remark';
            inRem.style.width = '100%';
            tdRem.appendChild(inRem);
            tr.appendChild(tdRem);

            // Action
            const tdAct = document.createElement('td');
            tdAct.style.whiteSpace = 'nowrap';
            
            const btnAdd = document.createElement('button');
            btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i>';
            btnAdd.className = 'btn secondary small';
            btnAdd.style.color = '#22c55e';
            btnAdd.style.marginRight = '5px';
            btnAdd.onclick = () => {
                syncNodesFromUI();
                const newNode = {
                    chainage: node.chainage + 0.002, // Add 20m default increment
                    existing: node.existing,
                    proposed: node.proposed,
                    obligatory: false,
                    remark: ""
                };
                appState.nodes.splice(idx + 1, 0, newNode);
                rebuildInputUI();
            };

            const btnDel = document.createElement('button');
            btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
            btnDel.className = 'btn secondary small';
            btnDel.style.color = '#ef4444';
            btnDel.onclick = () => {
                syncNodesFromUI();
                appState.nodes.splice(idx, 1);
                rebuildInputUI();
            };

            tdAct.appendChild(btnAdd);
            tdAct.appendChild(btnDel);
            tr.appendChild(tdAct);

            tbody.appendChild(tr);
        });

        elements.dataSection.classList.remove('hidden');
        elements.resultsSection.classList.add('hidden');
    }

    function syncNodesFromUI() {
        const rows = elements.levelsTable.querySelectorAll('tbody tr');
        rows.forEach((row, i) => {
            if (appState.nodes[i]) {
                const inCh = row.querySelector('.input-chainage');
                if (inCh) {
                    const parsedCh = parseUserChainage(inCh.value);
                    if (!isNaN(parsedCh)) appState.nodes[i].chainage = parsedCh;
                }
                appState.nodes[i].existing = parseFloat(row.querySelector('.input-existing').value) || 0;
                appState.nodes[i].obligatory = row.querySelector('.input-obligatory').checked;
                appState.nodes[i].remark = row.querySelector('.input-remark').value || "";
                appState.nodes[i].proposed = appState.nodes[i].existing; // Initialize optimizer
            }
        });
        
        // Ensure nodes are sorted by chainage in case they were modified out of order
        appState.nodes.sort((a, b) => a.chainage - b.chainage);
    }

    function getDistance(c1, c2) {
        const km1 = Math.floor(c1);
        const km2 = Math.floor(c2);
        const m1 = Math.round((c1 - km1) * 10000);
        const m2 = Math.round((c2 - km2) * 10000);

        if (km1 === km2) {
            return Math.abs(m2 - m1);
        } else {
            // Forward calculation assuming c2 > c1
            const len1 = appState.kmLengths[km1] || 1000;
            let d = len1 - m1;
            for (let k = km1 + 1; k < km2; k++) {
                d += (appState.kmLengths[k] || 1000);
            }
            d += m2;
            return d;
        }
    }

    function calculateProfile() {
        syncNodesFromUI();
        if (appState.nodes.length < 3) {
            showToast("Need at least 3 nodes to calculate a profile.");
            return;
        }

        const N = appState.nodes.length;
        const dists = new Array(N - 1);
        for (let i = 0; i < N - 1; i++) {
            dists[i] = getDistance(appState.nodes[i].chainage, appState.nodes[i+1].chainage);
            if (dists[i] <= 0) dists[i] = 20; // fallback safeguard
        }

        const maxLiftLimit = parseFloat(document.getElementById('max-lift').value) / 1000 || 0.100;
        const R_MIN = parseFloat(document.getElementById('min-radius').value) || 3000;
        
        let P = appState.nodes.map(n => n.existing);
        const E = appState.nodes.map(n => n.existing);
        const obl = appState.nodes.map(n => n.obligatory);

        // Safety Critical Rule: First and Last nodes MUST be obligatory (0 lift)
        // This guarantees safe run-in and run-out for live tracks without sudden ramps.
        obl[0] = true;
        if (N > 1) obl[N - 1] = true;

        // ── Optimisation Engine ────────────────────────────────────────────────
        // Four modes controlled by the UI dropdown:
        //
        //  BLEND = 1.0  Pure Laplacian    → pulls to straight chord (max smoothing)
        //  BLEND = 0.9  Anchored 0.9      → 90% chord / 10% existing (high smooth)
        //  BLEND = 0.5  Anchored 0.5      → 50% chord / 50% existing (moderate)
        //  BLEND = 0.0  Pure Min-Lift     → NO Laplacian, only fix radius violations
        // ──────────────────────────────────────────────────────────────────────
        const ITERATIONS = 15000;
        const LAP_ALPHA  = 0.1;
        const BLEND      = parseFloat(document.getElementById('opt-method')?.value ?? '0.9');

        for (let iter = 0; iter < ITERATIONS; iter++) {

            // ── Step 1: Laplacian smoothing (skipped entirely for Pure Min-Lift) ──
            if (BLEND > 0) {
                let newP = [...P];
                for (let i = 1; i < N - 1; i++) {
                    if (!obl[i]) {
                        const chord  = (P[i-1] * dists[i] + P[i+1] * dists[i-1]) / (dists[i-1] + dists[i]);
                        const target = BLEND * chord + (1 - BLEND) * E[i];
                        newP[i] = P[i] * (1 - LAP_ALPHA) + target * LAP_ALPHA;
                    }
                }
                P = newP;
            }

            // ── Step 2: Enforce lift bounds [E, E + maxLiftLimit] ──
            for (let i = 0; i < N; i++) {
                if (obl[i]) P[i] = E[i];
                else         P[i] = Math.max(E[i], Math.min(E[i] + maxLiftLimit, P[i]));
            }

            // ── Step 3: Curvature constraint — lift only to satisfy R >= R_MIN ──
            for (let i = 1; i < N - 1; i++) {
                const L_rmin  = (dists[i-1] + dists[i]) / (2 * R_MIN);
                const g_prev  = (P[i]   - P[i-1]) / dists[i-1];
                const g_next  = (P[i+1] - P[i])   / dists[i];
                const delta_g = g_next - g_prev;

                if (Math.abs(delta_g) <= L_rmin) continue;

                const weight = (1 / dists[i-1]) + (1 / dists[i]);

                if (delta_g > L_rmin && !obl[i]) {
                    const shift = 0.5 * (delta_g - L_rmin) / weight;
                    P[i] = Math.min(E[i] + maxLiftLimit, P[i] + shift);
                } else if (delta_g < -L_rmin) {
                    const shift = 0.5 * (-L_rmin - delta_g) / weight;
                    if (!obl[i-1]) P[i-1] = Math.min(E[i-1] + maxLiftLimit, P[i-1] + shift);
                    if (!obl[i+1]) P[i+1] = Math.min(E[i+1] + maxLiftLimit, P[i+1] + shift);
                }
            }

            // ── Step 4: Re-enforce bounds after curvature correction ──
            for (let i = 0; i < N; i++) {
                if (obl[i]) P[i] = E[i];
                else         P[i] = Math.max(E[i], Math.min(E[i] + maxLiftLimit, P[i]));
            }
        }

        // Final Bounds Enforcer (Do not restrict to maxLiftLimit here so 2500m breaks are preserved)
        for (let i = 0; i < N; i++) {
            if (obl[i]) P[i] = E[i];
            else if (P[i] < E[i]) P[i] = E[i];
        }

        // Save optimized nodes + compute actual achieved radius at each node
        let minAchievedRadius = Infinity;
        for (let i = 0; i < N; i++) {
            appState.nodes[i].proposed = P[i];
            if (i > 0 && i < N - 1) {
                const g_prev = (P[i] - P[i-1]) / dists[i-1];
                const g_next = (P[i+1] - P[i]) / dists[i];
                const delta_g = Math.abs(g_next - g_prev);
                const actualR = delta_g > 0.000001 ? Math.round(((dists[i-1] + dists[i]) / 2) / delta_g) : Infinity;
                appState.nodes[i].actualRadius = actualR;
                if (actualR < minAchievedRadius) minAchievedRadius = actualR;
            } else {
                appState.nodes[i].actualRadius = Infinity;
            }
        }
        appState.minAchievedRadius = isFinite(minAchievedRadius) ? minAchievedRadius : 0;
        appState.R_MIN_USED = R_MIN;

        // --- 4m Interpolation ---
        appState.results4m = [];
        const outInt = parseFloat(elements.outInterval.value) || 4;

        const exSpline = new MonotoneCubicSpline(
            appState.nodes.map((n, i) => i === 0 ? 0 : getDistance(appState.nodes[0].chainage, n.chainage)),
            appState.nodes.map(n => n.existing)
        );

        // Pre-compute global distances for all nodes (used by both exCurves and curves)
        let curGD = 0;
        const nodeGDs = [0];
        for (let i = 0; i < N - 1; i++) {
            curGD += dists[i];
            nodeGDs.push(curGD);
        }

        // --- Calculate Existing Track Vertical Curves (Parabolic) ---
        const exCurves = [];
        for (let i = 1; i < N - 1; i++) {
            const eg_prev = (appState.nodes[i].existing - appState.nodes[i-1].existing) / dists[i-1];
            const eg_next = (appState.nodes[i+1].existing - appState.nodes[i].existing) / dists[i];
            const edelta_g = eg_next - eg_prev;
            if (Math.abs(edelta_g) > 0.00005) {
                const eStartGD = nodeGDs[i] - (dists[i-1] / 2);
                const eEndGD   = nodeGDs[i] + (dists[i]   / 2);
                const eL_v = eEndGD - eStartGD;
                const ey_start = appState.nodes[i].existing - eg_prev * (dists[i-1] / 2);
                exCurves.push({ startGD: eStartGD, endGD: eEndGD, g_prev: eg_prev, delta_g: edelta_g, L_v: eL_v, y_start: ey_start });
            }
        }

        // Helper: interpolate existing level at a global distance using parabolic curves
        function exParabolic(gd, segIdx) {
            for (const c of exCurves) {
                if (gd >= c.startGD - 0.0001 && gd <= c.endGD + 0.0001) {
                    const x = gd - c.startGD;
                    return c.y_start + c.g_prev * x + 0.5 * (c.delta_g / c.L_v) * (x * x);
                }
            }
            // Linear tangent between nodes (outside all curves)
            const n1 = appState.nodes[segIdx];
            const n2 = appState.nodes[segIdx + 1];
            const frac = (gd - nodeGDs[segIdx]) / dists[segIdx];
            return n1.existing + frac * (n2.existing - n1.existing);
        }

        // --- Calculate Proposed Track Vertical Curves (Parabolic) ---
        const curves = [];

        for (let i = 1; i < N - 1; i++) {
            const g_prev = (appState.nodes[i].proposed - appState.nodes[i-1].proposed) / dists[i-1];
            const g_next = (appState.nodes[i+1].proposed - appState.nodes[i].proposed) / dists[i];
            const delta_g = g_next - g_prev;
            
            if (Math.abs(delta_g) > 0.00005) { // Meaningful gradient change
                const L_chord = (dists[i-1] + dists[i]) / 2;
                const R = Math.round(L_chord / Math.abs(delta_g));
                const startGD = nodeGDs[i] - (dists[i-1] / 2);
                const endGD = nodeGDs[i] + (dists[i] / 2);
                
                const startCh = appState.nodes[i].chainage - (dists[i-1] / 20000);
                const endCh = appState.nodes[i].chainage + (dists[i] / 20000);
                
                const L_v = endGD - startGD;
                const y_start_tangent = appState.nodes[i].proposed - g_prev * (dists[i-1] / 2);

                curves.push({
                    startGD,
                    endGD,
                    g_prev,
                    delta_g,
                    L_v,
                    y_start_tangent,
                    label: `Curve Radius: ${R} m (CH ${formatChainage(startCh)} to ${formatChainage(endCh)})`
                });
            }
        }

        let currentGlobalDist = 0;
        for (let i = 0; i < N - 1; i++) {
            const n1 = appState.nodes[i];
            const n2 = appState.nodes[i+1];
            const d = dists[i];

            // Add n1
            // Find if n1 is in a curve (apply parabolic smoothing)
            let n1Curve = null;
            let n1Pr = n1.proposed;
            for (const c of curves) {
                if (currentGlobalDist >= c.startGD - 0.0001 && currentGlobalDist <= c.endGD + 0.0001) {
                    n1Curve = c.label;
                    const x = currentGlobalDist - c.startGD;
                    const y_tangent = c.y_start_tangent + c.g_prev * x;
                    n1Pr = y_tangent + 0.5 * (c.delta_g / c.L_v) * (x * x);
                    break;
                }
            }

            if (i === 0) {
                let rem1 = n1.remark || "";
                if (n1.actualRadius && n1.actualRadius < R_MIN) {
                    rem1 += (rem1 ? " | " : "") + `(!) Radius ${n1.actualRadius}m < ${R_MIN}m`;
                }
                appState.results4m.push({
                    chainage: n1.chainage,
                    existing: n1.existing,
                    proposed: n1Pr,
                    remark: rem1,
                    isInterpolated: false,
                    curveLabel: n1Curve,
                    nodeIndex: i,
                    globalDist: 0,
                    actualRadius: n1.actualRadius
                });
            }

            // Interpolate points inside interval
            for (let j = outInt; j < d - 0.001; j += outInt) {
                const fraction = j / d;
                const gd = currentGlobalDist + j;
                
                // Parabolic Existing
                const ex = exParabolic(gd, i);
                
                // Parabolic Proposed (defaults to linear tangent)
                let pr = n1.proposed + fraction * (n2.proposed - n1.proposed);
                let gdCurve = null;

                for (const c of curves) {
                    if (gd >= c.startGD - 0.0001 && gd <= c.endGD + 0.0001) {
                        gdCurve = c.label;
                        const x = gd - c.startGD;
                        const y_tangent = c.y_start_tangent + c.g_prev * x;
                        pr = y_tangent + 0.5 * (c.delta_g / c.L_v) * (x * x);
                        break;
                    }
                }

                // Reconstruct chainage string for display (approximate km/m logic)
                const km1 = Math.floor(n1.chainage);
                const m1 = Math.round((n1.chainage - km1) * 10000);
                let newM = m1 + j;
                let newK = km1;
                const len1 = appState.kmLengths[km1] || 1000;
                if (newM >= len1) {
                    newM -= len1;
                    newK++;
                }
                const chValue = newK + (newM / 10000);


                appState.results4m.push({
                    chainage: chValue,
                    existing: ex,
                    proposed: pr,
                    remark: "", // Clear remark for interpolated rows
                    isInterpolated: true,
                    curveLabel: gdCurve,
                    globalDist: gd
                });
            }

            currentGlobalDist += d;

            // Find if n2 is in a curve
            let n2Curve = null;
            let n2Pr = n2.proposed;
            for (const c of curves) {
                if (currentGlobalDist >= c.startGD - 0.0001 && currentGlobalDist <= c.endGD + 0.0001) {
                    n2Curve = c.label;
                    const x = currentGlobalDist - c.startGD;
                    const y_tangent = c.y_start_tangent + c.g_prev * x;
                    n2Pr = y_tangent + 0.5 * (c.delta_g / c.L_v) * (x * x);
                    break;
                }
            }

            // Add n2
            let rem2 = n2.remark || "";
            if (n2.actualRadius && n2.actualRadius < R_MIN) {
                rem2 += (rem2 ? " | " : "") + `(!) Radius ${n2.actualRadius}m < ${R_MIN}m`;
            }
            appState.results4m.push({
                chainage: n2.chainage,
                existing: n2.existing,
                proposed: n2Pr,
                remark: rem2,
                isInterpolated: false,
                curveLabel: n2Curve,
                nodeIndex: i + 1,
                globalDist: currentGlobalDist,
                actualRadius: n2.actualRadius
            });
        }

        renderResults4m();
    }

    function renderResults4m() {
        const tbody = elements.resultsTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        const R_MIN = appState.R_MIN_USED || 3000;
        let totalLift = 0;
        let maxLift = 0;
        
        const uiMaxLiftLimit = parseFloat(document.getElementById('max-lift')?.value) || 100;

        appState.results4m.forEach((res, i) => {
            const tr = document.createElement('tr');
            tr.style.fontWeight = res.isInterpolated ? 'normal' : 'bold';

            // Amber warning: node where achieved radius is below the selected minimum
            let isUnderRadius = false;
            if (!res.isInterpolated && res.nodeIndex !== undefined) {
                const node = appState.nodes[res.nodeIndex];
                if (node && isFinite(node.actualRadius) && node.actualRadius < R_MIN) {
                    isUnderRadius = true;
                }
            }
            
            const tdCh = document.createElement('td');
            tdCh.textContent = formatChainage(res.chainage);
            tr.appendChild(tdCh);

            const tdEx = document.createElement('td');
            tdEx.textContent = res.existing.toFixed(3);
            tr.appendChild(tdEx);

            const tdExGradEmpty = document.createElement('td');
            tr.appendChild(tdExGradEmpty);

            const tdPr = document.createElement('td');
            tdPr.textContent = res.proposed.toFixed(3);
            tdPr.style.color = res.isInterpolated ? '#93c5fd' : '#3b82f6'; // distinct blues
            tr.appendChild(tdPr);

            const lift = (res.proposed - res.existing) * 1000;
            totalLift += lift;
            if (lift > maxLift) maxLift = lift;

            const tdLift = document.createElement('td');
            const liftVal = Math.max(0, lift);
            tdLift.textContent = liftVal.toFixed(0);
            
            if (liftVal <= uiMaxLiftLimit) {
                tdLift.style.color = '#22c55e'; // Green
            } else {
                tdLift.style.color = '#ef4444'; // Red
            }
            
            if (!res.isInterpolated) {
                tdLift.style.fontWeight = 'bold';
            }
            tr.appendChild(tdLift);

            // Apply amber row highlight if under-radius
            if (isUnderRadius) {
                tr.style.background = 'rgba(251, 191, 36, 0.10)';
                tr.title = `⚠ Achieved radius below ${R_MIN} m at this node (obligatory constraint forced a compromise).`;
                tdLift.style.color = '#fbbf24';
            }

            // Gradient (Empty in main row)
            const tdGradEmpty = document.createElement('td');
            tr.appendChild(tdGradEmpty);

            const tdRem = document.createElement('td');
            tdRem.textContent = res.remark;
            tr.appendChild(tdRem);

            tbody.appendChild(tr);

            // Intermediate Gradient Row
            if (i < appState.results4m.length - 1) {
                const next = appState.results4m[i+1];
                const d = next.globalDist - res.globalDist;
                if (d > 0) {
                    const prGrad = (next.proposed - res.proposed) / d;
                    let prGradText = 'Level';
                    if (Math.abs(prGrad) >= 0.000001) {
                        const x = Math.round(1 / Math.abs(prGrad));
                        const arrow = prGrad > 0 ? "(Up)" : "(Dn)";
                        prGradText = `1/${x} ${arrow}`;
                    }

                    const exGrad = (next.existing - res.existing) / d;
                    let exGradText = 'Level';
                    if (Math.abs(exGrad) >= 0.000001) {
                        const x = Math.round(1 / Math.abs(exGrad));
                        const arrow = exGrad > 0 ? "(Up)" : "(Dn)";
                        exGradText = `1/${x} ${arrow}`;
                    }

                    const trGrad = document.createElement('tr');
                    trGrad.style.background = 'rgba(255, 255, 255, 0.02)';
                    
                    const tdSpace1 = document.createElement('td');
                    tdSpace1.colSpan = 2;
                    tdSpace1.style.border = 'none';
                    tdSpace1.style.padding = '4px';
                    trGrad.appendChild(tdSpace1);

                    const tdExGradVal = document.createElement('td');
                    tdExGradVal.textContent = exGradText;
                    tdExGradVal.style.border = 'none';
                    tdExGradVal.style.padding = '4px';
                    tdExGradVal.style.textAlign = 'center';
                    tdExGradVal.style.color = '#94a3b8';
                    tdExGradVal.style.fontWeight = 'bold';
                    tdExGradVal.style.fontSize = '0.9rem';
                    trGrad.appendChild(tdExGradVal);

                    const tdSpace2 = document.createElement('td');
                    tdSpace2.colSpan = 2;
                    tdSpace2.style.border = 'none';
                    tdSpace2.style.padding = '4px';
                    trGrad.appendChild(tdSpace2);

                    const tdPrGradVal = document.createElement('td');
                    tdPrGradVal.textContent = prGradText;
                    tdPrGradVal.style.border = 'none';
                    tdPrGradVal.style.padding = '4px';
                    tdPrGradVal.style.textAlign = 'center';
                    tdPrGradVal.style.color = '#fbbf24';
                    tdPrGradVal.style.fontWeight = 'bold';
                    tdPrGradVal.style.fontSize = '0.9rem';
                    trGrad.appendChild(tdPrGradVal);

                    const tdSpace3 = document.createElement('td');
                    tdSpace3.style.border = 'none';
                    tdSpace3.style.padding = '4px';
                    trGrad.appendChild(tdSpace3);

                    tbody.appendChild(trGrad);
                }
            }
        });

        elements.statMaxLift.textContent = maxLift.toFixed(0) + " mm";
        elements.statTotalLift.textContent = totalLift.toFixed(0) + " mm*";

        // Update Min Curve Radius stat box with amber warning if below selected minimum
        const radiusStat = document.getElementById('stat-radius');
        if (radiusStat) {
            const achieved = appState.minAchievedRadius || 0;
            const rMin = appState.R_MIN_USED || 3000;
            if (achieved > 0 && achieved < rMin) {
                radiusStat.textContent = achieved + " m ⚠";
                radiusStat.style.color = '#fbbf24';
                radiusStat.title = `Below specified minimum of ${rMin} m — obligatory point constraint forced this geometry.`;
            } else {
                radiusStat.textContent = (achieved > 0 ? achieved : '≥ ' + rMin) + " m";
                radiusStat.style.color = '#60a5fa';
                radiusStat.title = '';
            }
        }

        elements.resultsSection.classList.remove('hidden');
        renderChart();
        // Auto-scroll to the graph after calculation
        setTimeout(() => {
            elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    function renderChart() {
        if (appState.results4m.length === 0) return;

        let filteredData = appState.results4m;
        const scaleVal = elements.chartScale ? elements.chartScale.value : 'full';
        
        if (scaleVal !== 'full') {
            const windowSize = parseInt(scaleVal);
            const startDist = appState.chartChunkIndex * windowSize;
            const endDist = startDist + windowSize;
            
            filteredData = appState.results4m.filter(r => r.globalDist >= startDist && r.globalDist <= endDist);
            
            // Handle edge case where filteredData is empty
            if (filteredData.length === 0 && appState.chartChunkIndex > 0) {
                appState.chartChunkIndex--;
                return renderChart(); // Recurse back
            }

            // Update UI buttons
            if (elements.btnChartPrev) elements.btnChartPrev.disabled = appState.chartChunkIndex === 0;
            
            // Check if there's data beyond this window
            const maxDist = appState.results4m[appState.results4m.length - 1].globalDist;
            if (elements.btnChartNext) elements.btnChartNext.disabled = endDist >= maxDist;
            
            if (filteredData.length > 0 && elements.chartRangeLabel) {
                const chStart = formatChainage(filteredData[0].chainage);
                const chEnd = formatChainage(filteredData[filteredData.length - 1].chainage);
                elements.chartRangeLabel.textContent = `${chStart} to ${chEnd}`;
            }
        } else {
            if (elements.btnChartPrev) elements.btnChartPrev.disabled = true;
            if (elements.btnChartNext) elements.btnChartNext.disabled = true;
            if (elements.chartRangeLabel) elements.chartRangeLabel.textContent = "All Chainages";
        }

        const labels = filteredData.map(r => formatChainage(r.chainage));
        const exData = filteredData.map(r => r.existing);
        const prData = filteredData.map(r => r.proposed);

        // Calculate min/max purely for the currently viewed chunk
        const minV = Math.min(...exData, ...prData);
        const maxV = Math.max(...exData, ...prData);
        const pad = (maxV - minV) * 0.1 || 0.1;

        if (appState.profileChart) {
            appState.profileChart.destroy();
        }

        appState.profileChart = new Chart(elements.chartCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Existing Level (m)',
                        data: exData,
                        borderColor: '#ef4444',
                        borderWidth: 1.5,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        pointRadius: 0
                    },
                    {
                        label: 'Proposed Level (m)',
                        data: prData,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderWidth: 1.5,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone',
                        pointRadius: 1,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8', maxTicksLimit: 20 },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        min: minV - pad,
                        max: maxV + pad,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#f8fafc' } },
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                if (context.length >= 2) {
                                    const ex = context.find(c => c.datasetIndex === 0)?.raw;
                                    const pr = context.find(c => c.datasetIndex === 1)?.raw;
                                    if (ex !== undefined && pr !== undefined) {
                                        const lift = (pr - ex) * 1000;
                                        let text = `\nLift: ${Math.max(0, lift).toFixed(0)} mm`;
                                        
                                        const idx = context[0].dataIndex;
                                        const curveLabel = appState.results4m[idx].curveLabel;
                                        if (curveLabel) {
                                            text += `\n\n[ ${curveLabel} ]`;
                                        }
                                        return text;
                                    }
                                }
                                return null;
                            }
                        }
                    }
                }
            }
        });
    }

    function handleExcelImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet, {header: 1});

            if (json.length > 0) {
                appState.nodes = [];
                appState.kmLengths = {};
                let startRow = 0;
                if (isNaN(parseFloat(json[0][0]))) startRow = 1;

                for (let i = startRow; i < json.length; i++) {
                    const row = json[i];
                    if (row.length >= 2) {
                        const chainageStr = row[0]?.toString();
                        const existing = parseFloat(row[1]);
                        const chainageVal = parseUserChainage(chainageStr);
                        
                        if (!isNaN(chainageVal) && !isNaN(existing)) {
                            // Column 2 = Km Length
                            const kmlen = parseFloat(row[2]);
                            if (!isNaN(kmlen) && kmlen > 0) {
                                appState.kmLengths[Math.floor(chainageVal)] = kmlen;
                            }
                            // Column 3 = Obligatory
                            const oblStr = row[3]?.toString().toLowerCase() || "";
                            const isObl = oblStr === "true" || oblStr === "yes" || oblStr === "1" || oblStr === "y";

                            // Column 4 = Remarks
                            const remark = row[4]?.toString() || "";

                            appState.nodes.push({
                                chainage: chainageVal,
                                existing: existing,
                                proposed: existing,
                                obligatory: isObl,
                                remark: remark
                            });
                        }
                    }
                }
                rebuildInputUI();
                showToast("Excel imported successfully.");
            }
        };
        reader.readAsArrayBuffer(file);
        fileInput.value = '';
    }

    function downloadTemplate() {
        const data = [
            ['Chainage', 'Existing Level (m)', 'Km Length (m)', 'Obligatory (Yes/No)', 'Remarks'],
            ['500.480', '100.150', '', 'Yes', 'Bridge approach - Zero lift required'],
            ['500.500', '100.120', '', '', ''],
            ['500.520', '100.100', '', '', ''],
            ['500.540', '100.080', '', '', ''],
            ['500.560', '100.110', '', '', ''],
            ['500.580', '100.160', '', '1', 'Level crossing']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Auto-size columns
        const colWidths = [
            { wch: 15 }, // Chainage
            { wch: 20 }, // Existing Level
            { wch: 15 }, // Km Length
            { wch: 20 }, // Obligatory
            { wch: 35 }  // Remarks
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "TrackLift_Pro_Template.xlsx");
    }

    function exportExcel() {
        if (appState.results4m.length === 0) return;
        
        const data = [['Chainage', 'Existing Level (m)', 'Ex. Gradient', 'Proposed Level (m)', 'Lift (mm)', 'Pr. Gradient', 'Remarks']];
        appState.results4m.forEach((r, i) => {
            const lift = (r.proposed - r.existing) * 1000;
            
            // Main Row
            data.push([
                formatChainage(r.chainage),
                r.existing.toFixed(3),
                "", // Ex. Gradient empty on main row
                r.proposed.toFixed(3),
                Math.max(0, lift).toFixed(0),
                "", // Pr. Gradient empty on main row
                r.remark
            ]);

            // Intermediate Gradient Row
            if (i < appState.results4m.length - 1) {
                const next = appState.results4m[i+1];
                const d = next.globalDist - r.globalDist;
                if (d > 0) {
                    const prG = (next.proposed - r.proposed) / d;
                    let prGradStr = "Level";
                    if (Math.abs(prG) >= 0.000001) prGradStr = `1/${Math.round(1 / Math.abs(prG))} ${prG > 0 ? "(Up)" : "(Dn)"}`;

                    const exG = (next.existing - r.existing) / d;
                    let exGradStr = "Level";
                    if (Math.abs(exG) >= 0.000001) exGradStr = `1/${Math.round(1 / Math.abs(exG))} ${exG > 0 ? "(Up)" : "(Dn)"}`;

                    data.push(["", "", exGradStr, "", "", prGradStr, ""]);
                }
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        const outInt = parseFloat(elements.outInterval.value) || 4;
        XLSX.utils.book_append_sheet(wb, ws, `TrackLift Pro ${outInt}m`);
        XLSX.writeFile(wb, "TrackLift_Pro_Optimized.xlsx");
    }

    function exportPDF() {
        if (appState.results4m.length === 0) return;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        // 1. First Page: Vector Graph
        doc.setFontSize(16);
        doc.text("Optimized Profile Graph", 14, 15);
        
        // Define graph area
        const marginX = 15;
        const marginY = 25;
        const width = 267;
        const height = 150;
        
        // Find min/max values
        const exData = appState.results4m.map(r => r.existing);
        const prData = appState.results4m.map(r => r.proposed);
        const minV = Math.min(...exData, ...prData);
        const maxV = Math.max(...exData, ...prData);
        const pad = (maxV - minV) * 0.1 || 0.1;
        const graphMinY = minV - pad;
        const graphMaxY = maxV + pad;
        const rangeY = graphMaxY - graphMinY;
        
        const maxDist = appState.results4m[appState.results4m.length - 1].globalDist;
        
        // Draw grid and axes
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        // Horizontal grid lines
        const numYTicks = 10;
        for(let i=0; i<=numYTicks; i++) {
            const yVal = graphMinY + (rangeY * i / numYTicks);
            const yPos = marginY + height - (height * i / numYTicks);
            doc.line(marginX, yPos, marginX + width, yPos);
            doc.text(yVal.toFixed(3), marginX - 2, yPos + 1, { align: 'right' });
        }
        
        // Vertical grid lines
        const numXTicks = 10;
        for(let i=0; i<=numXTicks; i++) {
            const xValDist = (maxDist * i / numXTicks);
            const xPos = marginX + (width * i / numXTicks);
            doc.line(xPos, marginY, xPos, marginY + height);
            
            // Find chainage roughly corresponding to this distance
            const r = appState.results4m.find(res => res.globalDist >= xValDist);
            if(r) {
                const chText = formatChainage(r.chainage);
                doc.text(chText, xPos, marginY + height + 5, { align: 'center' });
            }
        }
        
        // Plot Existing (Red)
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(0.4);
        for(let i=0; i<appState.results4m.length - 1; i++) {
            const r1 = appState.results4m[i];
            const r2 = appState.results4m[i+1];
            const x1 = marginX + (r1.globalDist / maxDist) * width;
            const y1 = marginY + height - ((r1.existing - graphMinY) / rangeY) * height;
            const x2 = marginX + (r2.globalDist / maxDist) * width;
            const y2 = marginY + height - ((r2.existing - graphMinY) / rangeY) * height;
            doc.line(x1, y1, x2, y2);
        }
        
        // Plot Proposed (Green)
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(0.6);
        for(let i=0; i<appState.results4m.length - 1; i++) {
            const r1 = appState.results4m[i];
            const r2 = appState.results4m[i+1];
            const x1 = marginX + (r1.globalDist / maxDist) * width;
            const y1 = marginY + height - ((r1.proposed - graphMinY) / rangeY) * height;
            const x2 = marginX + (r2.globalDist / maxDist) * width;
            const y2 = marginY + height - ((r2.proposed - graphMinY) / rangeY) * height;
            doc.line(x1, y1, x2, y2);
        }
        
        // Legend
        doc.setFontSize(10);
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(1.0);
        doc.line(marginX, marginY + height + 15, marginX + 10, marginY + height + 15);
        doc.setTextColor(0, 0, 0);
        doc.text("Existing Level", marginX + 12, marginY + height + 16);
        
        doc.setDrawColor(34, 197, 94);
        doc.line(marginX + 45, marginY + height + 15, marginX + 55, marginY + height + 15);
        doc.text("Proposed Level", marginX + 57, marginY + height + 16);
        
        // 2. Next Pages: Table
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Optimized Profile Data", 14, 15);
        
        const bodyData = [];
        appState.results4m.forEach((r, i) => {
            const lift = (r.proposed - r.existing) * 1000;
            
            bodyData.push([
                formatChainage(r.chainage),
                r.existing.toFixed(3),
                "", 
                r.proposed.toFixed(3),
                Math.max(0, lift).toFixed(0),
                "", 
                r.remark
            ]);

            if (i < appState.results4m.length - 1) {
                const next = appState.results4m[i+1];
                const d = next.globalDist - r.globalDist;
                if (d > 0) {
                    const prG = (next.proposed - r.proposed) / d;
                    let prGradStr = "Level";
                    if (Math.abs(prG) >= 0.000001) prGradStr = `1/${Math.round(1 / Math.abs(prG))} ${prG > 0 ? "(Up)" : "(Dn)"}`;

                    const exG = (next.existing - r.existing) / d;
                    let exGradStr = "Level";
                    if (Math.abs(exG) >= 0.000001) exGradStr = `1/${Math.round(1 / Math.abs(exG))} ${exG > 0 ? "(Up)" : "(Dn)"}`;

                    bodyData.push(["", "", exGradStr, "", "", prGradStr, ""]);
                }
            }
        });
        
        doc.autoTable({
            startY: 25,
            head: [['Chainage', 'Existing Level (m)', 'Ex. Gradient', 'Proposed Level (m)', 'Lift (mm)', 'Pr. Gradient', 'Remarks']],
            body: bodyData,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85], textColor: 255, halign: 'center' },
            bodyStyles: { textColor: 50 },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold' },
                1: { halign: 'center' },
                2: { halign: 'center', textColor: [100, 116, 139] },
                3: { halign: 'center' },
                4: { halign: 'center', fontStyle: 'bold' },
                5: { halign: 'center', textColor: [100, 116, 139] },
                6: { halign: 'left', cellWidth: 55, fontSize: 9 }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.row.raw[0] === "") {
                    data.cell.styles.fillColor = [248, 250, 252];
                    data.cell.styles.fontSize = 10;
                    data.cell.styles.fontStyle = 'italic';
                    data.cell.styles.textColor = [71, 85, 105]; // darker for readability
                } else if (data.section === 'body' && data.column.index === 4) {
                    const liftStr = data.cell.raw;
                    if (liftStr !== "") {
                        const liftVal = parseFloat(liftStr);
                        const pdfMaxLift = parseFloat(document.getElementById('max-lift')?.value) || 100;
                        if (!isNaN(liftVal)) {
                            if (liftVal <= pdfMaxLift) {
                                data.cell.styles.textColor = [34, 197, 94]; // Green
                            } else {
                                data.cell.styles.textColor = [239, 68, 68]; // Red
                            }
                        }
                    }
                }
            }
        });
        
        doc.save("TrackLift_Pro_Report.pdf");
    }

    function resetApp() {
        if (confirm("Reset all data?")) {
            appState.nodes = [];
            appState.results4m = [];
            appState.kmLengths = {};
            elements.dataSection.classList.add('hidden');
            elements.resultsSection.classList.add('hidden');
        }
    }

    function showToast(msg) {
        const toast = document.getElementById('toast-notification');
        document.getElementById('toast-message').textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
});

// Natural Cubic Spline Implementation
class NaturalCubicSpline {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const n = x.length;
        let a = [...y];
        let h = new Array(n - 1);
        for (let i = 0; i < n - 1; i++) h[i] = x[i+1] - x[i];

        let alpha = new Array(n - 1);
        for (let i = 1; i < n - 1; i++) {
            alpha[i] = (3 / h[i]) * (a[i+1] - a[i]) - (3 / h[i-1]) * (a[i] - a[i-1]);
        }

        let l = new Array(n).fill(1);
        let mu = new Array(n).fill(0);
        let z = new Array(n).fill(0);

        for (let i = 1; i < n - 1; i++) {
            l[i] = 2 * (x[i+1] - x[i-1]) - h[i-1] * mu[i-1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i-1] * z[i-1]) / l[i];
        }

        let c = new Array(n).fill(0);
        let b = new Array(n).fill(0);
        let d = new Array(n).fill(0);

        for (let j = n - 2; j >= 0; j--) {
            c[j] = z[j] - mu[j] * c[j+1];
            b[j] = (a[j+1] - a[j]) / h[j] - h[j] * (c[j+1] + 2 * c[j]) / 3;
            d[j] = (c[j+1] - c[j]) / (3 * h[j]);
        }

        this.a = a; this.b = b; this.c = c; this.d = d;
    }

    interpolate(xi) {
        if (xi <= this.x[0]) return this.y[0];
        if (xi >= this.x[this.x.length - 1]) return this.y[this.y.length - 1];

        // Binary search for interval
        let i = 0, j = this.x.length - 1;
        while (i <= j) {
            let k = Math.floor((i + j) / 2);
            if (this.x[k] < xi) i = k + 1;
            else if (this.x[k] > xi) j = k - 1;
            else return this.y[k];
        }
        i = j;

        let dx = xi - this.x[i];
        return this.a[i] + this.b[i] * dx + this.c[i] * dx * dx + this.d[i] * dx * dx * dx;
    }
}

// Monotone Cubic Spline (Fritsch-Carlson / PCHIP)
// Mathematically guarantees no overshooting or unnatural humps between data points.
class MonotoneCubicSpline {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const n = x.length;
        
        let delta = new Array(n - 1);
        let m = new Array(n);

        // Calculate secants
        for (let i = 0; i < n - 1; i++) {
            delta[i] = (y[i+1] - y[i]) / (x[i+1] - x[i]);
        }

        // Initialize tangents
        m[0] = delta[0];
        m[n - 1] = delta[n - 2];

        for (let i = 1; i < n - 1; i++) {
            if (delta[i-1] * delta[i] <= 0) {
                m[i] = 0; // Local extremum or flat, lock derivative to 0 to prevent overshoot
            } else {
                // Harmonic mean of secants
                m[i] = 2 / (1 / delta[i-1] + 1 / delta[i]);
            }
        }
        this.m = m;
    }

    interpolate(xi) {
        if (xi <= this.x[0]) return this.y[0];
        if (xi >= this.x[this.x.length - 1]) return this.y[this.y.length - 1];

        // Binary search for interval
        let i = 0, j = this.x.length - 1;
        while (i <= j) {
            let k = Math.floor((i + j) / 2);
            if (this.x[k] < xi) i = k + 1;
            else if (this.x[k] > xi) j = k - 1;
            else return this.y[k];
        }
        i = j;

        const h = this.x[i+1] - this.x[i];
        const t = (xi - this.x[i]) / h;
        const t2 = t * t;
        const t3 = t2 * t;

        // Hermite basis functions
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        return h00 * this.y[i] + h10 * h * this.m[i] + h01 * this.y[i+1] + h11 * h * this.m[i+1];
    }
}
