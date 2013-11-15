// Add debounce/throttle

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

    function debounce(fn, wait) {
        var id;
        return function () {
            var args = arguments, context = this;

            // Cancel already in flight
            if (id) {
                window.clearTimeout(id);
            }

            window.setTimeout(function () {
                fn.apply(context, args);
            }, wait);
        }
    }

    function main () {
        var $input = $('#textInput'),
            $results = $('#results');

        // Keep track of old state
        var jqXHR,
            currentText = '';

        var handler = function () {
            var text = $(this).val();

            // Cancel previous if one already out there
            if (jqXHR && jqXHR.state() === 'pending') {
                jqXHR.abort();
            }

            // Now check if text has changed
            if (text !== currentText) {
                currentText = text;

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
                            $('<li>' + xhr.statusText + '</li>').appendTo($results);
                        }
                    }
                );               
            }            
        };

        // Handle debounce for our key up behavior
    }

	$(function () {

		main();

	});    

}(this, jQuery))

