//Set up some basic resources we'll be using as we let the user choose their Giveaway
var resources = {
  //API and data storage
  api_url:              "https://api.printfection.com/v2",
  api_token:            "",
  campaigns:            null,
  selected_campaign:    localStorage.selected_campaign,
  order_info:           null,
  last_giveaway_link:   localStorage.last_giveaway_link,
  //Selectors
  $giveaway_select:     $('#js-select-giveaway'),
  $giveaway_link:       $('.js-create-new-link'),
  $old_link:            $('#js-view-old-link'),
  $final_link_input:    $('#js-final-link'),
  $generate_wrapper:    $('#js-generate-link'),
  $view_wrapper:        $('#js-view-link')
};

var plugin = {
  //Return all campaigns from PF
  get_campaigns: function() {
    $.ajax({
      type: "GET",
      url: resources.api_url + "/campaigns",
      dataType: "json",
      headers: {
        "Authorization": "Basic " + btoa(resources.api_token + ":")
      },
      success: function(data) {
        plugin.choose_campaigns(data);
      },
      error: function() {
        console.log("API Error: Can't return campaigns data.");
      }
    });
  },

  //Parse campaigns and fill form <select> with <option>s for customer to pick
  choose_campaigns: function(data) {
    //See if we're received the campaign data, otherwise bail out
    if (!data) {
      return false;
    };

    //Store data back with our resources object to use it later
    resources.campaigns = data;

    //Return all active Giveaway campaigns and display them in our <select>
    for (var campaign = 0; campaign < resources.campaigns.data.length; campaign++) {
      if (
        (resources.campaigns.data[campaign].active == true) &&
        (resources.campaigns.data[campaign].type == "giveaway" || resources.campaigns.data[campaign].type == "socialgiveaway")
      ) {
        resources.$giveaway_select.append($('<option>').val(resources.campaigns.data[campaign].id).text(resources.campaigns.data[campaign].name));
      };
    };

    plugin.setup();
    plugin.observe();
  },

  //Generate and return a link from the selected Giveaway campaign
  generate_link: function() {
    //See if a campaign is selected, otherwise bail out
    if (!resources.selected_campaign) {
      return false;
    };

    $.ajax({
      type: "POST",
      url: resources.api_url + "/orders",
      dataType: "json",
      headers: {
        "Authorization": "Basic " + btoa(resources.api_token + ":")
      },
      data: JSON.stringify({ campaign_id: resources.selected_campaign }),
      success: function(data) {
        plugin.store_new_link(data);
      },
      error: function() {
        console.log("API Error: Can't create new link.");
      }
    });
  },

  //Store our new link for later use
  store_new_link: function(data) {
    //See if we're received the order data, otherwise bail out
    if (!data) {
      return false;
    };

    //Store order data back in our resources object
    resources.order_info = data;
    resources.last_giveaway_link = resources.order_info.url;
    localStorage.last_giveaway_link = resources.last_giveaway_link;

    plugin.display_link();
  },

  //Show the last created link to the user
  display_link: function() {
    if (resources.last_giveaway_link) {
      resources.$final_link_input.val(resources.last_giveaway_link);
    };

    resources.$generate_wrapper.hide();
    resources.$view_wrapper.show();

    resources.$final_link_input.select();
  },

  //Watch user interaction and respond
  observe: function() {
    //Save newly selected campaign in local storage
    resources.$giveaway_select.change(function(event) {
      resources.selected_campaign = $(this).val();
      localStorage.selected_campaign = resources.selected_campaign;
    });

    //Go get a new Giveaway link and show user
    resources.$giveaway_link.click(function(event) {
      plugin.generate_link();
    });

    resources.$old_link.click(function(event) {
      plugin.display_link();
    });
  },

  //Check for and display local storage presets
  setup: function() {
    if (resources.selected_campaign) {
      $(resources.$giveaway_select).val(resources.selected_campaign);
    };

    $(resources.$giveaway_select).find('.loading').text('Choose a Campaign...');
  }
}

$(document).ready(function() {
  plugin.get_campaigns();
});