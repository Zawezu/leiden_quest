const modal = document.getElementById('infoModal');
const closeModalBtn = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const modalImage = document.getElementById('modalImage');
const modalBasicInfo = document.getElementById('modalBasicInfo')

modal.style.display = 'flex';
modalBasicInfo.style.display = 'block';
const panoramaImage = new PANOLENS.ImagePanorama("360_images/KPNO-Drone-360-2-CC2.jpg");
    
const panoramaViewer = new PANOLENS.Viewer({
    container: panoramaContainer,
});

panoramaViewer.add(panoramaImage)