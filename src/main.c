#include <pebble.h>

#define KEY_TEMPERATURE 0
#define KEY_CONDITIONS 1
#define KEY_CITY 2

static Window *main_window;
static TextLayer *time_layer;
static TextLayer *date_layer;
static TextLayer *day_of_week_layer;
static TextLayer *weather_layer;
static TextLayer *city_layer;
static TextLayer *battery_layer;

static GFont tall_font;

// TODO:
//   - Sports scores
//   - Time to work
//   - Better time font / switching fonts
//   - Better weather
//   - Day of week

static void update_time() {
  // Get a tm structure
  time_t sec_since_epoch = time(NULL); 
  struct tm *tick_time = localtime(&sec_since_epoch);
  static char buffer[] = "00:00";

  // Write the current hours and minutes into the buffer
  if(clock_is_24h_style() == true) {
    strftime(buffer, sizeof("00:00"), "%H:%M", tick_time);
  } else {
    // Use 12 hour format
    strftime(buffer, sizeof("00:00"), "%I:%M", tick_time);
  }

  text_layer_set_text(time_layer, buffer);
}

static void update_battery() {
  BatteryChargeState charge_state = battery_state_service_peek();
  static char buffer[] = "...%";
  
  if (charge_state.charge_percent == 100) {
    snprintf(buffer, sizeof(buffer), "100");
  } else {
    snprintf(buffer, sizeof(buffer), "%d%%", charge_state.charge_percent);
  }
  
  text_layer_set_text(battery_layer, buffer);
}

static void update_date() {
  // Get a tm structure
  time_t sec_since_epoch = time(NULL); 
  struct tm *tick_time = localtime(&sec_since_epoch);
  static char buffer[] = "00/00/00";
  
  strftime(buffer, sizeof("00/00/00"), "%D", tick_time);
  text_layer_set_text(date_layer, buffer);
  
  static char week_day_buffer[] = "SU";
  if (tick_time->tm_wday == 0) {
    snprintf(week_day_buffer, sizeof("SU"), "SU");
  } else if (tick_time->tm_wday == 1) {
    snprintf(week_day_buffer, sizeof("SU"), "MO");
  } else if (tick_time->tm_wday == 2) {
    snprintf(week_day_buffer, sizeof("SU"), "TU");
  } else if (tick_time->tm_wday == 3) {
    snprintf(week_day_buffer, sizeof("SU"), "WE");
  } else if (tick_time->tm_wday == 4) {
    snprintf(week_day_buffer, sizeof("SU"), "TH");
  } else if (tick_time->tm_wday == 5) {
    snprintf(week_day_buffer, sizeof("SU"), "FR");
  } else if (tick_time->tm_wday == 6) {
    snprintf(week_day_buffer, sizeof("SU"), "SA");
  } else {
    snprintf(week_day_buffer, sizeof("SU"), "--");
  }

  text_layer_set_text(day_of_week_layer, week_day_buffer);
}

static void minute_update(struct tm *tick_time, TimeUnits units_changed) {
  update_time();
  
  // Update battery percentage every 10 min
  if (tick_time->tm_min % 10 == 0) {
    update_battery();
  }
  
  // Get weather update every 30 minutes
  if(tick_time->tm_min % 30 == 0) {
    DictionaryIterator *iter;
    app_message_outbox_begin(&iter);
    dict_write_uint8(iter, 0, 0);
    app_message_outbox_send();
  }
  
  // Update date when the date changes
  if(tick_time->tm_hour == 0 && tick_time->tm_min == 0) {
    update_date();
  }
}

static void main_window_load(Window *window) {

  tall_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_BITHAM_LARGE_50));
  
  // Create time TextLayer
  time_layer = text_layer_create(GRect(0, 24, 144, 60));
  text_layer_set_background_color(time_layer, GColorBlack);
  text_layer_set_text_color(time_layer, GColorWhite);
  text_layer_set_font(time_layer, tall_font);
  text_layer_set_text_alignment(time_layer, GTextAlignmentCenter);
  text_layer_set_text(time_layer, "00:00");
  layer_add_child(window_get_root_layer(main_window), text_layer_get_layer(time_layer));
  
  // Create date TextLayer
  date_layer = text_layer_create(GRect(0, 0, 80, 24));
  text_layer_set_background_color(date_layer, GColorBlack);
  text_layer_set_text_color(date_layer, GColorWhite);
  text_layer_set_font(date_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(date_layer, GTextAlignmentLeft);
  text_layer_set_text(date_layer, "00/00/00");
  layer_add_child(window_get_root_layer(main_window), text_layer_get_layer(date_layer));
  
  // Create battery TextLayer
  battery_layer = text_layer_create(GRect(104, 0, 40, 24));
  text_layer_set_background_color(battery_layer, GColorBlack);
  text_layer_set_text_color(battery_layer, GColorWhite);
  text_layer_set_font(battery_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(battery_layer, GTextAlignmentRight);
  text_layer_set_text(battery_layer, "...%");
  layer_add_child(window_get_root_layer(main_window), text_layer_get_layer(battery_layer));
  
  // Create day_of_week TextLayer
  day_of_week_layer = text_layer_create(GRect(80, 0, 24, 24));
  text_layer_set_background_color(day_of_week_layer, GColorBlack);
  text_layer_set_text_color(day_of_week_layer, GColorWhite);
  text_layer_set_font(day_of_week_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(day_of_week_layer, GTextAlignmentRight);
  text_layer_set_text(day_of_week_layer, "--");
  layer_add_child(window_get_root_layer(main_window), text_layer_get_layer(day_of_week_layer));
  
  // Create temperature Layer
  weather_layer = text_layer_create(GRect(0, 144, 144, 24));
  text_layer_set_background_color(weather_layer, GColorBlack);
  text_layer_set_text_color(weather_layer, GColorWhite);
  text_layer_set_text_alignment(weather_layer, GTextAlignmentCenter);
  text_layer_set_font(weather_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text(weather_layer, "Loading...");
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(weather_layer));
  
  // Create city layer
  city_layer = text_layer_create(GRect(0,120, 144, 24));
  text_layer_set_background_color(city_layer, GColorBlack);
  text_layer_set_text_color(city_layer, GColorWhite);
  text_layer_set_text_alignment(city_layer, GTextAlignmentLeft);
  text_layer_set_font(city_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text(city_layer, "Loading...");
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(city_layer));
  
}

static void main_window_unload(Window *window) {
  // Destroy TEXT elements
  text_layer_destroy(time_layer);
  text_layer_destroy(date_layer);
  text_layer_destroy(weather_layer);
  text_layer_destroy(city_layer);
  
  fonts_unload_custom_font(tall_font);
}

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  Tuple *t = dict_read_first(iterator);
  
  static char temperature_buffer[8];
  static char conditions_buffer[32];
  static char city_layer_buffer[32];
  static char weather_layer_buffer[32];

  while(t != NULL) {
    switch(t->key) {
    case KEY_TEMPERATURE:
      snprintf(temperature_buffer, sizeof(temperature_buffer), "%dF", (int)t->value->int32);
      break;
    case KEY_CONDITIONS:
      snprintf(conditions_buffer, sizeof(conditions_buffer), "%s", t->value->cstring);
      break;
    case KEY_CITY:
      snprintf(city_layer_buffer, sizeof(city_layer_buffer), "%s:", t->value->cstring);
      break;
    default:
      APP_LOG(APP_LOG_LEVEL_ERROR, "Key %d not recognized!", (int)t->key);
      break;
    }

    t = dict_read_next(iterator);
  }
  
  // Assemble full string and display
  snprintf(weather_layer_buffer, sizeof(weather_layer_buffer), "%s, %s", temperature_buffer, conditions_buffer);
  text_layer_set_text(weather_layer, weather_layer_buffer);
  text_layer_set_text(city_layer, city_layer_buffer);
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped!");
}

static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox send failed!");
}

static void outbox_sent_callback(DictionaryIterator *iterator, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "Outbox send success!");
}  
  
static void init() {
  // Create main window
  main_window = window_create();
  window_set_window_handlers(main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload
  });
  window_set_background_color(main_window, GColorBlack);
  window_stack_push(main_window, true);
  
  // Register with TickTimerService
  tick_timer_service_subscribe(MINUTE_UNIT, minute_update);
  update_time();
  update_date();
  update_battery();

  
  // Register callbacks
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  app_message_register_outbox_sent(outbox_sent_callback);
  // Open AppMessage
  app_message_open(app_message_inbox_size_maximum(), app_message_outbox_size_maximum());

}

static void deinit() {
  window_destroy(main_window);
}
  
int main(void) {
  init();
  app_event_loop();
  deinit();
}
