// Add distinct

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
        var jqXHR,
            currentText = '';

        $input.keyup(function () {
            var text = $(this).val();

            // Cancel previous if one already out there
            if (jqXHR && jqXHR.state() === 'pending') {
                jqXHR.abort();
            }

            // Now check if text has changed

            $results.empty();

            jqXHR = searchWikipedia(currentText);

            jqXHR.then(
                function (data) {

                    var result = data[1];
                    $.each(result, function (i, value) {
                        $('<li>' + value + '</li>').appendTo($results);
                    });

                }, 
                function (err) {
                    if (jqXHR.statusText !== 'abort') {
                        $('<li>' + jqXHR.statusText + '</li>').appendTo($results);
                    }
                }
            ); 


        });
    }

	$(function () {

		main();

	});    

}(this, jQuery))

