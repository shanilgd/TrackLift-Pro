const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const doc = new Document({
    creator: "TrackLift-Pro Development Team",
    title: "TrackLift-Pro Project Report",
    description: "Detailed project report covering all aspects of the TrackLift-Pro software.",
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "TrackLift-Pro: Comprehensive Project Report",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            
            // Section 1: Introduction and Software Architecture
            new Paragraph({ text: "1. Introduction and Software Architecture", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "TrackLift-Pro is a cross-platform desktop application built using the " }),
                    new TextRun({ text: "Electron", bold: true }),
                    new TextRun({ text: " framework. The purpose of this software is to assist in railway maintenance by optimizing the vertical track profile for tamping machines. By packaging Node.js backend capabilities alongside a Chromium frontend, the application provides a seamless desktop experience without the need for complex server deployments." })
                ]
            }),
            new Paragraph({ text: "The user interface is constructed using standard web technologies: HTML5, CSS3, and JavaScript (ES6+). Styling is accomplished using vanilla CSS, ensuring a highly responsive, performant, and modern aesthetic without relying on heavy external framework dependencies. All data processing and intensive mathematical algorithms are executed locally on the client side via the V8 JavaScript engine, resulting in fast, native-like performance even when processing thousands of track stations." }),
            new Paragraph({ text: "" }),

            // Section 2: Mathematical Foundations & Algorithms
            new Paragraph({ text: "2. Mathematical Foundations & Algorithms", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "The core engine of TrackLift-Pro relies on advanced heuristic optimization algorithms and mathematically sound interpolation techniques to compute the smoothest possible vertical track profile while respecting real-world lift and lower constraints." }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "2.1 Versine Calculations", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Versine is defined as the offset of the track from a theoretical chord connecting two points. Assuming standard uniform station spacing of 10 meters, the equations for a station " }),
                    new TextRun({ text: "i", italics: true }),
                    new TextRun({ text: " are as follows:" }),
                ],
            }),
            new Paragraph({ text: "• 20m Chord Versine (V20):", bold: true, bullet: { level: 0 } }),
            new Paragraph({ text: "A 20m chord spans 10m on either side of the measured station. It uses stations [i-1], [i], and [i+1].", bullet: { level: 1 } }),
            new Paragraph({ text: "Equation: V20_i = L_i - (L_{i-1} + L_{i+1}) / 2", italics: true, bullet: { level: 1 } }),
            
            new Paragraph({ text: "• 80m Chord Versine (V80):", bold: true, bullet: { level: 0 } }),
            new Paragraph({ text: "An 80m chord spans 40m on either side of the measured station. It uses stations [i-4], [i], and [i+4].", bullet: { level: 1 } }),
            new Paragraph({ text: "Equation: V80_i = L_i - (L_{i-4} + L_{i+4}) / 2", italics: true, bullet: { level: 1 } }),
            new Paragraph({ text: "Where L is the track level at a given station." }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "2.1.1 Significance of Short (20m) and Long (80m) Chords", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "In railway track geometry, evaluating unevenness requires measuring deviations over different wavelengths, as different chord lengths impact train dynamics in distinctly different ways:" }),
            new Paragraph({ text: "• Short Chord (20m): The 20m chord is used to measure short-wavelength track defects. These defects cause high-frequency vertical accelerations in the train. From a passenger perspective, this manifests as sharp, uncomfortable vibrations or 'chatter.' From an engineering perspective, short-wave defects exert high dynamic impact forces on the rail-wheel interface, leading to accelerated wear of rail components, wheel flats, and damage to the primary suspension system. Smoothing the 20m versine is critical for maintaining high-speed ride comfort and reducing immediate mechanical fatigue.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Long Chord (80m): The 80m chord measures long-wavelength geometric deviations. While trains easily glide over short defects at lower speeds, at high speeds (e.g., >100 km/h), long-wave deviations can perfectly match the natural resonant frequency of the train's bogie and secondary suspension system. This causes the train to begin 'pitching' or 'bouncing' continuously, potentially leading to a dangerous loss of wheel load and increasing the risk of derailment. Controlling the 80m versine ensures aerodynamic stability and prevents suspension resonance during high-speed transit.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "2.2 Standard Deviation (SD)", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "Standard deviation represents the un-evenness of the track over a running window. It is typically calculated over a 200m rolling window centered on the station to track geometric variations continuously:" }),
            new Paragraph({ text: "SD = sqrt( Σ(V_k - Mean(V))^2 / N )", italics: true }),
            new Paragraph({ text: "2.2.1 Fixed Block Exception (First & Last 100m)", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "A true 200m rolling window requires looking 100m backward and 100m forward from any given station. However, for stations located near the physical ends of the dataset, there is not enough surveyed data to look backwards or forwards." }),
            new Paragraph({ text: "To solve this, TrackLift-Pro implements a Fixed Block Exception:" }),
            new Paragraph({ text: "• First 100m: For all stations located within the first 100 meters of the block section, the software uses a fixed window tied to the absolute first 200m of the track. The SD value reported for these stations is identical, representing the roughness of that entire initial 200m chunk.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Last 100m: Similarly, for all stations located within the last 100 meters, the software fixes the window to the absolute final 200m of the track.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Middle Section: For all stations in between, the software reverts to a dynamic, true rolling window perfectly centered on each station.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "2.3 Optimization Engine (Simulated Annealing)", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "The solver employs a heuristic optimization algorithm inspired by " }),
                    new TextRun({ text: "Simulated Annealing", bold: true }),
                    new TextRun({ text: ". The process follows these steps:" }),
                ]
            }),
            new Paragraph({ text: "Simulated Annealing is a probabilistic technique for approximating the global optimum of a given function. In the context of TrackLift-Pro, the 'cost function' is a mathematical penalty score representing how 'bad' the track geometry is (high versines, high standard deviation, or excessive lowering). The goal of the engine is to find the track profile with the lowest possible cost. The detailed workflow is as follows:" }),
            new Paragraph({ text: "Phase 1: Initialization", bold: true, heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• The system starts by copying the 'Existing Level' as the initial 'Proposed Level'.", bullet: { level: 0 } }),
            new Paragraph({ text: "• A virtual 'Temperature' is initialized at a high value. This temperature dictates how much 'chaos' or randomness is allowed in the system.", bullet: { level: 0 } }),
            new Paragraph({ text: "• The initial Global Cost is calculated based on versine limit violations, SD violations, and lift/lower penalties.", bullet: { level: 0 } }),
            
            new Paragraph({ text: "Phase 2: Iterative Randomization (The Annealing Loop)", bold: true, heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "For each iteration (up to the user-specified limit, e.g., 100,000):", italics: true }),
            new Paragraph({ text: "• Perturbation: The engine selects a random, non-locked station and applies a tiny, random adjustment (up or down) to its Proposed Level, constrained by the Custom Max Lift/Lower limits.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Cost Evaluation: The software recalculates the entire track's Global Cost with this new adjustment.", bullet: { level: 0 } }),
            
            new Paragraph({ text: "Phase 3: Acceptance Probability", bold: true, heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• If the new cost is LOWER (the track got smoother), the adjustment is immediately ACCEPTED.", bullet: { level: 0 } }),
            new Paragraph({ text: "• If the new cost is HIGHER (the track got worse), the adjustment is NOT immediately rejected. Instead, the engine uses the current 'Temperature' to calculate an acceptance probability. When the temperature is high (early in the process), it frequently accepts 'worse' profiles. This is a critical mathematical trick to allow the algorithm to escape 'local minima' (getting trapped in a sub-optimal but decent shape) and explore a wider range of possibilities to find the true 'global minimum' (the absolute smoothest profile).", bullet: { level: 0 } }),
            
            new Paragraph({ text: "Phase 4: Cooling Schedule", bold: true, heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• As iterations progress, the virtual 'Temperature' slowly cools down (decreases).", bullet: { level: 0 } }),
            new Paragraph({ text: "• As it cools, the probability of accepting 'worse' profiles approaches zero. The engine transitions from wild exploration into precise, localized fine-tuning.", bullet: { level: 0 } }),
            
            new Paragraph({ text: "Phase 5: Finalization", bold: true, heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "• Once the temperature reaches zero or the max iterations are hit, the final Proposed Levels are locked in, delivering the mathematically smoothest track profile possible under the given lifting constraints.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "2.4 The Hybrid Engine: Cubic Spline & Linear Interpolation", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "When generating tamping machine exports, the software must compute sub-stations at 3.33m intervals. TrackLift-Pro utilizes a unique Hybrid Engine:" }),
            new Paragraph({ text: "• Proposed Profile (Cubic Spline): The optimized track levels are perfectly smooth. A Natural Cubic Spline algorithm is applied to mathematically trace the physical elastic bending of the rail curve, outputting micro-precise 3.33m intermediate marks without breaking the curve's fluidity.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Existing Profile (Linear Interpolation): The existing (un-tamped) track geometry is jagged and bumpy. If a cubic spline were applied here, it would create artificial 'overshoots' and phantom potholes in the mathematical model. To prevent this, stable Linear Interpolation is actively used to suppress these artificial spikes, yielding accurate existing levels.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            // Section 3: User Interface Guide
            new Paragraph({ text: "3. User Interface Guide (Buttons, Panels, and Cells)", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "This section details the purpose of every interactive element in the software." }),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "3.1 Data Entry Panel", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "• Paste Data from Excel: Allows users to copy columns of data (Chainage, Level, Optional Custom Limits) directly from an Excel sheet and paste them into the software. The system auto-detects numerical data and ignores headers.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Clear Data: Wipes all currently loaded track stations from the application memory.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Interactive Table Cells: The data table contains inputs for Custom Max Lift, Custom Max Lower, and Remarks. For example, if a specific station under a bridge can only be lifted by 5mm, the user can type '5' in the Custom Max Lift cell for that specific row.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Lock Checkbox: By ticking the 'Locked' box on a station, the user forces the optimizer to maintain the exact existing level at that point (Lift/Lower becomes exactly 0).", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "3.2 Configuration & Constraint Panel", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "This panel contains the absolute boundaries and limits that guide the optimization engine. Any proposed track profile must strive to exist within these parameters:" }),
            new Paragraph({ text: "• Target V20 Limit (mm): The maximum allowable deviation for the 20m short chord. Restricting this limit forces the engine to eliminate sharp, high-frequency track defects that cause intense vertical train vibrations.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Target V80 Limit (mm): The maximum allowable deviation for the 80m long chord. Restricting this limit prevents long-wave geometry sweeping that could cause train suspension resonance at high speeds.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Target SD20 / SD80 Limits: Standard Deviation limits dictate the overall permitted 'roughness' over a sliding window. Even if individual versines pass, if the track is consistently jagged, the SD will fail.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Default Max Lift (mm): Establishes the global hard ceiling for raising the track. In railway engineering, lifting the track (adding ballast) is structurally sound and preferred. This sets the maximum allowable upward movement for any station unless overridden by a Custom Max Lift cell.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Default Max Lower (mm): Establishes the global hard floor for dropping the track. Lowering track geometry requires excavating existing ballast, which is highly disruptive. This is typically kept at 0mm, forcing the machine to only lift.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Interval (m): Defines the mathematical distance between surveyed stations (typically 10 meters).", bullet: { level: 0 } }),
            new Paragraph({ text: "• Iterations: Controls the computational depth of the Simulated Annealing engine. For example, '100000' instructs the solver to evaluate 100,000 distinct, randomized track combinations to find the absolute lowest global cost. Higher values guarantee smoother tracks at the expense of slightly longer processing time.", bullet: { level: 0 } }),
            
            new Paragraph({ text: "3.2.1 Smoothness Emphasis Factor", heading: HeadingLevel.HEADING_3 }),
            new Paragraph({ text: "The Smoothness Emphasis Factor is the primary control knob for tuning the aggressiveness of the optimization engine. In the backend cost function, the software balances two competing desires: (1) Minimize structural track movement (stay close to the existing track), and (2) Minimize versine/SD deviations (make the track perfectly flat). This dropdown dictates which desire wins." }),
            new Paragraph({ text: "The software offers four levels of emphasis:" }),
            new Paragraph({ text: "1. Low (Weight = 1): The solver prioritizes minimizing the sheer volume of track lifting. It will allow small humps and dips to remain in the profile, hugging the existing jagged track tightly, provided the deviations barely pass the safety limits. Ideal for areas where lifting is extremely difficult.", bullet: { level: 0 } }),
            new Paragraph({ text: "2. Medium (Weight = 10): Standard track alignment smoothing. Provides a balanced compromise between achieving a comfortable ride quality and conserving ballast usage.", bullet: { level: 0 } }),
            new Paragraph({ text: "3. High (Weight = 50): The solver becomes highly sensitive to track roughness. It aggressively flattens humps and dips by pushing the track levels up to the maximum allowable Custom Lift limits.", bullet: { level: 0 } }),
            new Paragraph({ text: "4. Extreme (Weight = 200): The solver applies an overwhelming mathematical penalty to any microscopic geometric defect. This forces the engine to ignore ballast conservation completely, relentlessly lifting the track to achieve a perfectly flat, glass-like running surface. Ideal for high-speed corridors.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "• Start Optimization Button: Locks in all configurations and triggers the backend solver.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "3.3 Project Details Panel", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "• Zone / Division / PWAY Section: Text input fields used to record the metadata of the railway project.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Km From / Km To: Used to indicate the start and end of the block section being evaluated.", bullet: { level: 0 } }),
            new Paragraph({ text: "These details are automatically printed on the headers of all exported PDF and Excel reports.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "3.4 Result Table & Display Cells", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "• Existing vs Proposed Level: Displays the original surveyor level vs the newly calculated optimal level (in meters).", bullet: { level: 0 } }),
            new Paragraph({ text: "• Lift/Lower (mm): Displays the required machine operation. Example: '+25.0' means the tamping machine must lift the track by 25 millimeters.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Compliance Status: Automatically checks all proposed versines against the user's limits. Shows 'PASS' (Green) or 'FAIL' (Red).", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "3.5 Interactive Graph Features", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "The software provides two visual dashboards powered by dynamic charting algorithms, designed to provide a macro-level overview of the track geometry:" }),
            new Paragraph({ text: "• Profile vs. Chainage Graph: Overlays the rugged Existing Profile (red/blue) with the smooth Proposed Profile (green). This visualizes how the optimization engine has mathematically 'ironed out' the track.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Lift/Lower vs. Chainage Graph: A bar chart that explicitly graphs the physical machine operations required at each station. Spikes indicate areas requiring heavy tamping.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Hover Data Tooltips: Users can hover their cursor over any point on the graphs to instantly view the exact Chainage, Existing Level, Proposed Level, and calculated Lift/Lower amount without digging through the data table.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Horizontal Pan & Zoom Slider: For large datasets (e.g., several kilometers of track), the graphs can become visually dense. The slider bar at the bottom allows users to dynamically zoom into specific 200m or 500m blocks and pan horizontally to visually inspect specific track defects up close.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "3.6 Export Buttons", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "• Export Main PDF: Generates a professionally structured Level Book in PDF format, containing the full 10m station data. Features sticky-styled, multi-tiered headers and end-aligned remarks.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Export Tamping PDF: Specifically designed for tamping machine operators. Calculates and prints two sub-stations (at 3.33m and 6.67m) between every 10m standard station using the Hybrid Spline Engine.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Export Excel: Exports all results to an `.xlsx` spreadsheet with text-wrapped headers, optimized column widths, and proper cell formatting for external review.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            // Section 4: Technical Constraints & Limitations
            new Paragraph({ text: "4. Technical Constraints & Limitations", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "4.1 Virtual Boundary Extrapolation", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "To compute the 20m and 80m versines for the stations near the physical ends of the dataset (the first 4 and last 4 stations for an 80m chord), the software utilizes linear extrapolation. It projects the existing and proposed gradients out into 'virtual space'. However, these virtual calculations are hidden from the user interface to prevent analytical confusion during inspections." }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "4.2 Lift vs. Lower Bias Weightage", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: "In railway maintenance, lifting the track with ballast is structurally sound and standard practice. Lowering the track requires removing ballast and excavating, which is highly disruptive. The solver explicitly hardcodes a 10x penalty multiplier to any 'lowering' adjustments. This mathematically biases the Projected Gradient Descent to overwhelmingly favor lifting the track." }),
            new Paragraph({ text: "" }),
            
            // Conclusion
            new Paragraph({ text: "5. Conclusion", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "TrackLift-Pro seamlessly integrates powerful node-based computational algorithms with an intuitive front-end architecture, delivering unparalleled precision in vertical track profiling. The integration of Natural Cubic Splines for interpolation and Simulated Annealing for geometry optimization ensures an industry-standard output ready for immediate deployment on automated tamping machines." })
        ],
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("TrackLift-Pro_Project_Report_v6.docx", buffer);
    console.log("TrackLift-Pro_Project_Report_v6.docx created successfully");
}).catch((err) => {
    console.error("Failed to generate document:", err);
});
