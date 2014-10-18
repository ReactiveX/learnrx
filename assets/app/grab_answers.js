$('.get-answer').on('click', function(){
  window.prompt("Ctrl-C your answer json bellow", localStorage.getItem("newState"));
});

$('.set-answer').on('click', function(){
  var text = '';
  text = window.prompt("Enter your answer json bellow");
  localStorage.setItem('newState', text);
  window.location.reload();
});
