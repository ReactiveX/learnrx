$('.show-answers').on('click', function(){
    $(".lesson").each(function(cnt,item) {
        var go = $(".go", item)[0],
            code = $(".code", item)[0],
            answer = $(".answer", item).text(),
            post = $(".post", item)[0],
            codeMirror = window.codeMirrors[cnt];

        // Prevents the screen from freezing 
        setTimeout(function(){
            // Copy from code element if no answer is required for a lesson
            if (answer === "") answer = $(code).text();
            // Save code only if the lesson has any
            if (codeMirror != null) {
                codeMirror.setValue(answer);
                codeMirror.save();
            }
            item.style.visibility = "visible";
            if (post !== undefined) {
                post.style.visibility = "visible";
            }
        }, 1);
    });
});