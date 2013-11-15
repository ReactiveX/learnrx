(function (window, $, undefined) {

    function searchWikipedia (term) {
        return $.ajax({
            url: 'http://en.wikipedia.org/w/api.php',
            dataType: 'jsonp',
            data: {
                action: 'opensearch',
                format: 'json',
                search: encodeURI(term)
            }
        });
    }

    function main () {
        var $input = $('#textInput'),
            $results = $('#results');

        $input.keyup(function () {
            var text = $(this).val();

            $results.empty();

            searchWikipedia(text).then(
                function (data) {

                    var result = data[1];
                    $.each(result, function (i, value) {
                        $('<li>' + value + '</li>').appendTo($results);
                    });

                }, 
                function (err) {
                    $('<li>' + err + '</li>').appendTo($results);
                }
            );
        });
    }

	$(function () {

		main();

	});    

}(this, jQuery))

