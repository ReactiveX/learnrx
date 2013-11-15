(function (window, $, undefined) {

    function main () {
        var $input = $('#textInput'),
            $results = $('#results');

        $input.keyup(function () {
            var text = $(this).val();

            $results.empty();

            $('<li>' + text + '</li>').appendTo($results);
        });
    }

	$(function () {

		main();

	});    

}(this, jQuery))

