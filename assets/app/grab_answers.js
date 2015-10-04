$('.get-answer').on('click', function () {
    window.prompt("Ctrl-C your answer JSON below", localStorage.getItem("newState"));
});

$('.set-answer').on('click', function () {
    var text = '';
    text = window.prompt("Enter your answer JSON below");
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
});
