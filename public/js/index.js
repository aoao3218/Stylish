const slider = document.querySelector(".slider");
const slides = slider.querySelectorAll(".banner");
const search = document.getElementById("search");
let index = 0;

(function beginActive() {
  return slides[index].classList.add("active");
})();

if(slides.length > 1) {
  setInterval(() => {
    slides[index].classList.remove("active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("active");
  }, 5000);
}

search.addEventListener("keydown",(event) => {
  if (event.key == "Enter") {
    event.preventDefault(); 
    const inputText = search.value;
    window.location.assign(`/index.html?keyword=${inputText}`);
  }
})