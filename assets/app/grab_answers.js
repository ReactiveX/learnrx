$('.get-answer').on('click', function () {
  window.prompt("Ctrl-C your answer JSON below", localStorage.getItem("newState"));
});
function setJSONValue(text) {
  if (text) {  //do it if it is not Empty
    try {
      JSON.parse(text);
      localStorage.setItem('newState', text);
      window.location.reload();
    } catch (error) {
      alert('Invalid JSON! Please try it again.');
      throw (error);
    }
  }
}
//check for bootstrap modal
if (typeof $.fn.modal !== 'undefined') {
    var isSaveBtn = false,
        $getJsonModal = $("#modalGetJSON"),
        $saveBtn = $getJsonModal.find('.save-btn');
    var $modalGetJSON = $getJsonModal.modal({show: false});
    $modalGetJSON.on('show.bs.modal', function () {
        var modal = $(this);
        //do something on show
        modal.find('.modal-body [name="answerText"]').val("");
    })
        .on('hide.bs.modal', function (event) {
            if (isSaveBtn) {
                var modal = $(this);
                var answerText = modal.find('.modal-body [name="answerText"]').val();
                setJSONValue(answerText);
            }
        });
    $saveBtn.click(function () {
        isSaveBtn = true;
    });
    $('.set-answer').on('click', function () {
        $modalGetJSON.modal('show');
    });
} else {
    $('.set-answer').on('click', function () {
        var text = '';
        text = window.prompt("Enter your answer JSON below");
        setJSONValue(text);
    });
}
