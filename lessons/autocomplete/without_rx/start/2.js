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

            // Query wikipedia
        });
    }

	$(function () {

		main();

	});    

}(this, jQuery))

