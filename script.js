const upload = document.getElementById("imageUpload");
const widthInput = document.getElementById("imgWidth");
const gapXInput = document.getElementById("gapX");
const gapYInput = document.getElementById("gapY");
const marginInput = document.getElementById("margin");
const keepRatio = document.getElementById("keepRatio");

const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageCounter = document.getElementById("pageCounter");

const paper = document.getElementById("paper");
const layout = document.getElementById("layoutArea");
const downloadBtn = document.getElementById("downloadBtn");

let images = [];
let pages = [];
let currentPage = 0;

/* A4 real size for PDF */
const PDF_WIDTH = 794;
const PDF_HEIGHT = 1123;

function cmToPx(cm) {
  return cm * 37.8;
}

/* ========================= */
/* Upload Images */
/* ========================= */

upload.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);

  Promise.all(files.map(loadImage)).then((result) => {
    images = result;
    generatePages();
  });
});

widthInput.addEventListener("input", generatePages);
gapXInput.addEventListener("input", generatePages);
gapYInput.addEventListener("input", generatePages);
marginInput.addEventListener("input", generatePages);

/* Re-render when screen resized */
window.addEventListener("resize", () => {
  if (images.length > 0) {
    generatePages();
  }
});

/* ========================= */
/* Load Image */
/* ========================= */

function loadImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          src: e.target.result,
          width: img.width,
          height: img.height,
        });
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/* ========================= */
/* Generate Layout Pages */
/* ========================= */

function generatePages() {
  if (images.length === 0) return;

  pages = [];

  const imgWidth = cmToPx(parseFloat(widthInput.value));
  const gapX = cmToPx(parseFloat(gapXInput.value));
  const gapY = cmToPx(parseFloat(gapYInput.value));
  const margin = cmToPx(parseFloat(marginInput.value));

  /* Responsive preview width */
  const paperRect = paper.getBoundingClientRect();

  const pageWidth = paperRect.width - margin * 2;
  const pageHeight = paperRect.height - margin * 2;

  let current = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;

  for (let img of images) {
    let imgHeight;

    if (keepRatio.checked) {
      imgHeight = (img.height / img.width) * imgWidth;
    } else {
      imgHeight = imgWidth;
    }

    /* New row */
    if (x + imgWidth > pageWidth) {
      x = 0;
      y += rowHeight + gapY;
      rowHeight = 0;
    }

    /* New page */
    if (y + imgHeight > pageHeight) {
      pages.push(current);

      current = [];
      x = 0;
      y = 0;
      rowHeight = 0;
    }

    current.push({
      ...img,
      x,
      y,
      renderWidth: imgWidth,
      renderHeight: imgHeight,
    });

    x += imgWidth + gapX;

    if (imgHeight > rowHeight) {
      rowHeight = imgHeight;
    }
  }

  if (current.length > 0) {
    pages.push(current);
  }

  currentPage = 0;

  renderPage();
}

/* ========================= */
/* Render Current Page */
/* ========================= */

function renderPage() {
  layout.innerHTML = "";

  const margin = cmToPx(parseFloat(marginInput.value));

  paper.style.padding = margin + "px";

  const page = pages[currentPage];

  for (let img of page) {
    const element = document.createElement("img");

    element.src = img.src;
    element.classList.add("preview-image");

    element.style.left = img.x + "px";
    element.style.top = img.y + "px";

    element.style.width = img.renderWidth + "px";
    element.style.height = img.renderHeight + "px";

    layout.appendChild(element);
  }

  pageCounter.innerText = `Page ${currentPage + 1} / ${pages.length}`;
}

/* ========================= */
/* Navigation */
/* ========================= */

nextBtn.addEventListener("click", () => {
  if (currentPage < pages.length - 1) {
    currentPage++;
    renderPage();
  }
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
});

/* ========================= */
/* Download PDF */
/* ========================= */

downloadBtn.addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "pt", "a4");

  /* Save preview style */
  const oldWidth = paper.style.width;
  const oldHeight = paper.style.height;
  const oldShadow = paper.style.boxShadow;
  const oldRadius = paper.style.borderRadius;

  /* Force desktop A4 size */
  paper.style.width = PDF_WIDTH + "px";
  paper.style.height = PDF_HEIGHT + "px";

  paper.style.boxShadow = "none";
  paper.style.borderRadius = "0px";

  /* Regenerate pages using fixed A4 */
  generatePages();

  for (let i = 0; i < pages.length; i++) {
    currentPage = i;
    renderPage();

    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(paper, {
      backgroundColor: "#ffffff",
      scale: 2,
    });

    const imgData = canvas.toDataURL("image/png");

    if (i > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, "PNG", 0, 0, 595, 842, undefined, "FAST");
  }

  /* Restore preview */
  paper.style.width = oldWidth;
  paper.style.height = oldHeight;
  paper.style.boxShadow = oldShadow;
  paper.style.borderRadius = oldRadius;

  generatePages();

  pdf.save("LabLayout.pdf");
});
