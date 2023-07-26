const form = document.querySelector("#campaign");
const message =document.querySelector("#message")

form.addEventListener("submit", (e) => {
  e.preventDefault(); 

  const formData = new FormData(form);

  fetch("/admin/campaigns", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      message.textContent = data.msg;
      message.style.display = "block";
      if (data.ok) {
        form.reset();
      }
    })
    .catch((err) => {
      console.log(err);
    });
});
