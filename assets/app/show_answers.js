$('.show-answers').on('click', function(){
    $(".lesson").each(function(cnt,item) {
        var go = $(".go", item)[0],
            code = $(".code", item)[0],
            answer = $(".answer", item).text(),
            post = $(".post", item)[0],
            codeMirror = window.codeMirrors[cnt];
            
            $(code).val(answer);
            codeMirror.setValue(answer);
            codeMirror.save();
            item.style.visibility = "visible";
            if (post !== undefined) {
                post.style.visibility = "visible";
            }
    });
});