$('.get-answer').on('click', function(){
  window.prompt("Ctrl-C your answer JSON below", localStorage.getItem("newState"));
});

$('.set-answer').on('click', function(){
  var text = '';
  text = window.prompt("Enter your answer JSON below");
  localStorage.setItem('newState', text);
  window.location.reload();
});
