//Set up some basic resources we'll be using as we let the user choose their Giveaway
var resources = {
  //API and data storage
  api_url:                    "https://api.printfection.com/v2",
  api_key:                    null,
  campaigns:                  null,
  selected_campaign:          localStorage.selected_campaign,
  order_info:                 null,
  last_giveaway_link:         localStorage.last_giveaway_link,
  giveaway_redemptions:       [],
  total_campaigns:            0,
  limit:                      100,
  retrys:                     0,
  observer_setup:             0,

  //Selectors
  $api_alert:                 $('#js-alert'),
  $giveaway_select:           $('#js-select-giveaway'),
  $giveaway_link:             $('.js-create-new-link'),
  $old_links:                 $('.js-view-old-links'),
  $results_table:             $('#js-results-table'),
  $final_link_input:          $('#js-final-link'),
  $generate_wrapper:          $('#js-generate-link'),
  $view_wrapper:              $('#js-view-link'),
  $results_wrapper:           $('#js-link-results')
};

var plugin = {
  //Prep resources from local storage if it exists
  prep_resources: function() {
    if (localStorage.giveaway_redemptions) {
      resources.giveaway_redemptions = $.parseJSON(localStorage.giveaway_redemptions);
    } else {
      resources.$old_links.hide();
    }
  },

  //Return all campaigns from PF
  get_campaigns: function(_offset=0) {
    chrome.storage.sync.get("stored_api_key", function(data) {
      resources.api_key = data.stored_api_key;
      call_ajax(_offset);
    });

    //Break ajax call into function that runs on sucessful chrome storage return above
    function call_ajax(_offset) {
      $.ajax({
        type: "GET",
        url: resources.api_url + "/campaigns",
        dataType: "json",
        headers: {
          "Authorization": "Basic " + btoa(resources.api_key + ":")
        },
        data: { offset:_offset, limit:resources.limit},
        success: function(data) {
            resources.total_campaigns += data.data.length;
            resources.retrys++;
            if (data.data.length >= resources.limit && resources.retrys < 10) {
              var _new_offset = (resources.total_campaigns/resources.limit)*resources.limit;
              plugin.get_campaigns(_new_offset);
            }
          plugin.choose_campaigns(data);
        },
        error: function() {
          resources.$api_alert.show();
        }
      });
    }
  },

  //Parse campaigns and fill form <select> with <option>s for customer to pick
  choose_campaigns: function(data) {
    //See if we've received the campaign data, otherwise bail out
    if (!data) {
      return false;
    };

    //Store data back with our resources object to use it later
    resources.campaigns = data;

    //Return all active Giveaway campaigns and display them in our <select>
    resources.campaigns.data.forEach(function(campaign) {
      if (
        (campaign.active == true) &&
        (campaign.type == "giveaway" || campaign.type == "socialgiveaway")
      ) {
        resources.$giveaway_select.append($('<option>').val(campaign.id).text(campaign.name));
      };
    });

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
        "Authorization": "Basic " + btoa(resources.api_key + ":")
      },
      data: JSON.stringify({ campaign_id: resources.selected_campaign }),
      success: function(data) {
        plugin.store_new_link(data);
      },
      error: function() {
        resources.$api_alert.show();
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

    //Store URL for later use (also in local storage)
    resources.last_giveaway_link = resources.order_info.url;
    localStorage.last_giveaway_link = resources.last_giveaway_link;

    var new_redemption = {
      created_at: new Date(),
      campaign_name: resources.order_info.campaign.name,
      url: resources.order_info.url
    };

    //Prep our JSON Array to store the new data (hold 5 links and meta info)
    if (resources.giveaway_redemptions.length > 4) {
      resources.giveaway_redemptions.shift();
    };

    //Store the latest redemption in our giveaway_redemptions array
    resources.giveaway_redemptions.push(new_redemption);

    //Store same information in our local storage array for use later
    localStorage.giveaway_redemptions = JSON.stringify(resources.giveaway_redemptions);

    plugin.prep_results();
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

  //Show a table of the last 5 sent links pull from local storage
  prep_results: function(generated) {
    resources.$results_table.children('tr').remove();

    //Loop our array and generate our results table
    resources.giveaway_redemptions.forEach(function(result,index) {
      var date = new Date(result.created_at);

      resources.$results_table.prepend(
        "<tr><td>" + $.formatDateTime('m/dd/y', date) + " at " + $.formatDateTime('g:iia', date)
        + "</td><td>" + result.campaign_name
        + "</td><td><a target='_blank' href='" + result.url + "'>"
        + result.url.replace(/.*?:\/\//g, "")
        + "</a></td></tr>"
      );
    });

    //Visual feedback for the newest added row
    resources.$results_table.children('tr').first().animate({opacity: 0.35}, 400).animate({opacity: 1}, 400);
  },

  //Watch user interaction and respond
  observe: function() {

    if (resources.observer_setup) { return; }

    //Save newly selected campaign in local storage
    resources.$giveaway_select.change(function(event) {
      resources.selected_campaign = $(this).val();
      localStorage.selected_campaign = resources.selected_campaign;
    });

    //Go get a new Giveaway link and show user
    resources.$giveaway_link.click(function(event) {
      event.preventDefault();
      plugin.generate_link();
      resources.$results_wrapper.show();
    });

    resources.$old_links.click(function(event) {
      event.preventDefault();
      resources.$results_wrapper.toggle();
    });

    resources.observer_setup = 1;
  },

  //Check for and display local storage presets
  setup: function() {
    if (resources.selected_campaign) {
      $(resources.$giveaway_select).val(resources.selected_campaign);
    };

    $(resources.$giveaway_select).find('.loading').text('Choose a Campaign...');
  }
}

//Fire everything up once document has loaded
$(document).ready(function() {
  plugin.prep_resources();
  plugin.prep_results();
  plugin.get_campaigns();
});