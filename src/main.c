#include <pebble.h>

#define KEY_TEMPERATURE 0
#define KEY_CONDITIONS 1
#define KEY_INFO 2
#define KEY_IN_INFO 3

static Window *main_window;
static TextLayer *time_layer;
static TextLayer *date_layer;
static TextLayer *day_of_week_layer;
static TextLayer *weather_layer;
static TextLayer *steps_layer;
static TextLayer *battery_layer;
static TextLayer *info_layer;
static TextLayer *bluetooth_layer;

static GFont tall_font;

// 1 is true, 0 is false
static bool in_game;

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

static void update_bluetooth() {
  static char bluetooth_buffer[] = "L";
  
  if (connection_service_peek_pebble_app_connection()) {
    snprintf(bluetooth_buffer, sizeof("C"), "C");
  } else {
    snprintf(bluetooth_buffer, sizeof("D"), "D");
  }
  
  text_layer_set_text(bluetooth_layer, bluetooth_buffer);
}

static void update_battery() {
  BatteryChargeState charge_state = battery_state_service_peek();
  static char buffer[] = "..%";
  
  snprintf(buffer, sizeof(buffer), "%d%%", charge_state.charge_percent);
  
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
  update_bluetooth();
  
  // Update battery percentage every 15 min
  if (tick_time->tm_min % 15 == 0) {
    update_battery();
  }
  
  // Update date when the date changes
  if(tick_time->tm_hour == 0 && tick_time->tm_min == 0) {
    update_date();
  }

  // We want to get info from phone
  if ((tick_time->tm_min % 15 == 0) ||
      (in_game && (tick_time->tm_min % 3 == 0)) ||
      (tick_time->tm_min % 15 == 0)) {

    DictionaryIterator *iter;
    app_message_outbox_begin(&iter);
    
    // Get weather update every 15 minutes
    if(tick_time->tm_min % 15 == 0) {
      dict_write_uint8(iter, KEY_TEMPERATURE, 0);
    }
    
    // Get new info, which is traffic or game data
    // This won't always call back
    if ((in_game && (tick_time->tm_min % 3 == 0)) ||
        (tick_time->tm_min % 10 == 0)) {
        dict_write_uint8(iter, KEY_INFO, 0);
    }
  
    app_message_outbox_send();
        
  }
  
}

static void health_handler(HealthEventType event, void *context) {
  static char s_value_buffer[8];
  if (event == HealthEventMovementUpdate) {
    // display the step count
    snprintf(s_value_buffer, sizeof(s_value_buffer), "%d", (int)health_service_sum_today(HealthMetricStepCount));
    text_layer_set_text(steps_layer, s_value_buffer);
  }
}

static void main_window_load(Window *window) {

  tall_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_BITHAM_LARGE_50));
  
  // Create time TextLayer
  time_layer = text_layer_create(GRect(0, 24, 144, 56));
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
  text_layer_set_text(battery_layer, "..%");
  layer_add_child(window_get_root_layer(main_window), text_layer_get_layer(battery_layer));
  
  // Create day_of_week TextLayer
  day_of_week_layer = text_layer_create(GRect(80, 0, 24, 24));
  text_layer_set_background_color(day_of_week_layer, GColorBlack);
  text_layer_set_text_color(day_of_week_layer, GColorWhite);
  text_layer_set_font(day_of_week_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(day_of_week_layer, GTextAlignmentRight);
  text_layer_set_text(day_of_week_layer, "--");
  layer_add_child(window_get_root_layer(main_window), text_layer_get_layer(day_of_week_layer));
  
  // Create info TextLayer
  info_layer = text_layer_create(GRect(0, 80, 144, 30));
  text_layer_set_background_color(info_layer, GColorBlack);
  text_layer_set_text_color(info_layer, GColorWhite);
  text_layer_set_text_alignment(info_layer, GTextAlignmentCenter);
  text_layer_set_font(info_layer, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD));
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(info_layer));
  
  // Create weather Layer
  weather_layer = text_layer_create(GRect(0, 134, 144, 34));
  text_layer_set_background_color(weather_layer, GColorBlack);
  text_layer_set_text_color(weather_layer, GColorWhite);
  text_layer_set_text_alignment(weather_layer, GTextAlignmentCenter);
  text_layer_set_font(weather_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text(weather_layer, "Loading...");
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(weather_layer));
  
  // Create steps layer
  steps_layer = text_layer_create(GRect(20, 110, 100, 24));
  text_layer_set_background_color(steps_layer, GColorBlack);
  text_layer_set_text_color(steps_layer, GColorWhite);
  text_layer_set_text_alignment(steps_layer, GTextAlignmentLeft);
  text_layer_set_font(steps_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text(steps_layer, "");
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(steps_layer));
  
  // Create bluetooth layer
  bluetooth_layer = text_layer_create(GRect(120, 110, 24, 24));
  text_layer_set_background_color(bluetooth_layer, GColorBlack);
  text_layer_set_text_color(bluetooth_layer, GColorWhite);
  text_layer_set_text_alignment(bluetooth_layer, GTextAlignmentLeft);
  text_layer_set_font(bluetooth_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text(bluetooth_layer, "L");
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(bluetooth_layer));
  
}

static void main_window_unload(Window *window) {
  // Destroy TEXT elements
  text_layer_destroy(time_layer);
  text_layer_destroy(date_layer);
  text_layer_destroy(weather_layer);
  text_layer_destroy(steps_layer);
  text_layer_destroy(info_layer);
  text_layer_destroy(bluetooth_layer);
  
  fonts_unload_custom_font(tall_font);
}

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  Tuple *t = dict_read_first(iterator);
  
  static char temperature_buffer[8];
  static char conditions_buffer[32];
  static char weather_layer_buffer[32];
  static char info_layer_buffer[32];
  
  bool isInfo = false;

  while(t != NULL) {
    switch(t->key) {
    case KEY_TEMPERATURE:
      snprintf(temperature_buffer, sizeof(temperature_buffer), "%s", t->value->cstring);
      break;
    case KEY_CONDITIONS:
      snprintf(conditions_buffer, sizeof(conditions_buffer), "%s", t->value->cstring);
      break;
    case KEY_INFO:
      isInfo = true;
      snprintf(info_layer_buffer, sizeof(info_layer_buffer), "%s", t->value->cstring);
      break;
    case KEY_IN_INFO:
      if (t->value->int8 == 1) {
        APP_LOG(APP_LOG_LEVEL_ERROR, "In game");
        in_game = true;
      } else {
        APP_LOG(APP_LOG_LEVEL_ERROR, "Not in game");
        in_game = false;
      }
      break;
    default:
      APP_LOG(APP_LOG_LEVEL_ERROR, "Key %d not recognized!", (int)t->key);
      break;
    }

    t = dict_read_next(iterator);
  }
  
  if (isInfo) {
    text_layer_set_text(info_layer, info_layer_buffer);
  } else {
    // Assemble full string and display
    snprintf(weather_layer_buffer, sizeof(weather_layer_buffer), "%s, %s", temperature_buffer, conditions_buffer);
    text_layer_set_text(weather_layer, weather_layer_buffer);
  }
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
  
  // Initial updates
  in_game = true;
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
  
  // subscribe to health events
  if (health_service_events_subscribe(health_handler, NULL)) {
    // force initial steps display
    health_handler(HealthEventMovementUpdate, NULL);
  } else {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Health not available!");
  }

}

static void deinit() {
  window_destroy(main_window);
}
  
int main(void) {
  init();
  app_event_loop();
  deinit();
}
