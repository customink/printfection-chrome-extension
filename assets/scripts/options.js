//Selectors
var $api_key_input =  $('#js-api-key');
var $save =           $('#js-save');
var $confirm =        $('#js-confirm');
var $label =          $('#js-api-label');

//Save the API key
function save_options() {
  //API and data storage
  var api_key = $('#js-api-key').val();

  chrome.storage.sync.set({
    stored_api_key: api_key
  }, function() {
    $save.hide();
    $confirm.show();
  });
}

//Show existing API key
function show_current() {
  chrome.storage.sync.get("stored_api_key", function(data) {
    if (data.stored_api_key) {
      $api_key_input.attr('placeholder', '-- Enter a New API Key --');
      $label.text('Update Your API Key')
    };
  });
}

//Fire it all up
$(document).ready(function() {
  show_current();

  $save.click(function(event) {
    event.preventDefault();
    save_options();
  });
});