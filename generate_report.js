const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const doc = new Document({
    creator: "TrackLift-Pro Development Team",
    title: "TrackLift-Pro Technical Report",
    description: "Detailed technical documentation for the TrackLift-Pro software.",
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "TrackLift-Pro: Technical Documentation",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "1. Software Platform", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "TrackLift-Pro is built as a cross-platform desktop application using the " }),
                    new TextRun({ text: "Electron", bold: true }),
                    new TextRun({ text: " framework. This allows it to package Node.js backend capabilities alongside a Chromium frontend. The user interface is developed using standard web technologies: HTML5, CSS3, and JavaScript (ES6+). Styling is done using vanilla CSS to maintain a responsive and modern aesthetic without heavy external framework dependencies. Data processing and algorithm execution are primarily handled on the client side via the V8 JavaScript engine for fast, native-like performance." }),
                ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "2. Theories of Profile Generation", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "The core engine of TrackLift-Pro relies on a heuristic optimization algorithm inspired by " }),
                    new TextRun({ text: "Simulated Annealing", bold: true }),
                    new TextRun({ text: " and iterative local search. The goal is to generate an optimal vertical track profile (Proposed Level) that minimizes deviations in track geometry while respecting physical lift/lower constraints." }),
                ],
            }),
            new Paragraph({ text: "The optimization process:" }),
            new Paragraph({ text: "• Defines a cost function encompassing 20m and 80m chord versine deviations, standard deviation limits, and lifting/lowering penalties.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Evaluates small, randomized adjustments to station track levels (proposing new levels).", bullet: { level: 0 } }),
            new Paragraph({ text: "• Accepts adjustments that lower the overall system cost.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Iteratively refines the profile until the desired number of iterations is reached or the cost function stabilizes.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "3. Equations Used", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "3.1 Versine Calculation", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Versine is calculated as the offset of the track from a theoretical chord connecting two points. For a station " }),
                    new TextRun({ text: "i", italics: true }),
                    new TextRun({ text: ", assuming uniform station spacing (e.g., 5m):" }),
                ],
            }),
            new Paragraph({ text: "• 20m Chord Versine (V20): Uses stations [i-2], [i], and [i+2].", bullet: { level: 0 } }),
            new Paragraph({ text: "  Equation: V20_i = L_i - (L_{i-2} + L_{i+2}) / 2", bullet: { level: 1 } }),
            new Paragraph({ text: "• 80m Chord Versine (V80): Uses stations [i-8], [i], and [i+8].", bullet: { level: 0 } }),
            new Paragraph({ text: "  Equation: V80_i = L_i - (L_{i-8} + L_{i+8}) / 2", bullet: { level: 1 } }),
            new Paragraph({ text: "Where L is the track level at a given station." }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "3.2 Standard Deviation (SD)", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Standard deviation represents the un-evenness of the track over a running window. It is calculated over a rolling window (e.g., 9 stations):" }),
                ],
            }),
            new Paragraph({ text: "SD = sqrt( Σ(V_k - Mean(V))^2 / N )" }),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "4. Limits and Technical Data", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Virtual Boundary Extrapolation: ", bold: true }),
                    new TextRun({ text: "To compute the 20m and 80m versines for the stations near the boundary (first 8 and last 8 stations), the software relies on linear extrapolation of the existing and proposed levels beyond the input dataset. These virtual values are utilized strictly for backend computations to prevent boundary discontinuities and are hidden from the final user results." }),
                ],
            }),
            new Paragraph({ text: "" }),
            
            new Paragraph({ text: "5. Behavior on Changing Emphasis Factors", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "The solver employs " }),
                    new TextRun({ text: "Emphasis Factors", bold: true }),
                    new TextRun({ text: " (weights) to balance competing objectives in the cost function:" }),
                ],
            }),
            new Paragraph({ text: "• Versine Penalty: Penalizes profiles where the calculated versine exceeds the targeted limits.", bullet: { level: 0 } }),
            new Paragraph({ text: "• SD Penalty: High emphasis forces the solver to prioritize track smoothness (low standard deviation).", bullet: { level: 0 } }),
            new Paragraph({ text: "• Lift/Lower Bias: The software heavily penalizes track lowering. Specifically, the weightage of lowering is set to 10x compared to lifting (1x). This forces the optimizer to naturally prefer lifting operations, which is structurally safer and easier in field maintenance.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "6. User Inputs and Features", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "• Data Import: Users can paste data directly from Excel or import .xlsx/.csv files. The software auto-detects columns and cleans numeric data.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Station Locks: Users can \"Lock\" specific stations, forcing the optimizer to maintain the exact existing level at those points.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Lift/Lower Limits: Hard boundaries on maximum allowable lift and lower (in mm).", bullet: { level: 0 } }),
            new Paragraph({ text: "• Iterations: Controls the computational depth of the optimization engine. Higher values yield better profiles at the cost of processing time.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "7. Dos and Don'ts", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "Dos:", bold: true }),
            new Paragraph({ text: "• Always verify the maximum lift/lower constraints match your site conditions.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Use station locking sparingly, typically only at fixed structures (bridges, level crossings).", bullet: { level: 0 } }),
            new Paragraph({ text: "• Increase iterations (e.g., 100,000+) for highly distorted track segments to ensure convergence.", bullet: { level: 0 } }),
            new Paragraph({ text: "Don'ts:", bold: true }),
            new Paragraph({ text: "• Do not lock adjacent stations with drastically varying levels, as it will break smoothing algorithms.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Avoid importing non-numeric data into the Level/Station columns.", bullet: { level: 0 } }),
            new Paragraph({ text: "" }),

            new Paragraph({ text: "8. Restrictions and Limitations", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "• Boundary Station Displays: Because the 80m chord check requires 8 stations (40m) on either side of the measured point, the first 8 and last 8 stations cannot have true physical 80m chord readings. These fields are intentionally hidden in the result table to avoid confusion.", bullet: { level: 0 } }),
            new Paragraph({ text: "• 20m Chord Boundary Displays: Similarly, the first 2 and last 2 stations hide the 20m chord versine readings.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Processing Time: Very large datasets (>5,000 stations) with extreme iteration counts may cause momentary UI unresponsiveness.", bullet: { level: 0 } })
        ],
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("TrackLift-Pro_Technical_Manual.docx", buffer);
    console.log("Document created successfully");
});
