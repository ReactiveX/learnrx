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

        // Keep track of old state
        var jqXHR;

        $input.keyup(function () {
            var text = $(this).val();

            $results.empty();

            // Cancel previous if one already out there

            jqXHR = searchWikipedia(text);

            jqXHR.then(
                function (data) {

                    var result = data[1];
                    $.each(result, function (i, value) {
                        $('<li>' + value + '</li>').appendTo($results);
                    });

                }, 
                function (xhr) {

                    // Handle any aborts as ok operations
                    $('<li>' + xhr.statusText + '</li>').appendTo($results);
                }
            );
        });
    }

	$(function () {

		main();

	});    

}(this, jQuery))

