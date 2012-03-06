// utilities
// generate a random integer between the lower and upper bound,
// including lower and excluding upper
function random(lower, upper) {
    return Math.floor(Math.random() * (upper - lower)) + lower;
}

// configuration
var interarrival_time_lower = 1;
var interarrival_time_upper = 25;
var service_time_lower = 5;
var service_time_upper = 15;
var stop_time = 8 * 60;

// initialization
var clock = 0;
var idle = true;
var length_of_waiting_line = 0;
var max_length_of_waiting_line = 0;
var time_of_service_completion = stop_time + 1; // TODO

var time_of_arrival = random(interarrival_time_lower, interarrival_time_upper);

while (true) {
    // advance time to the next event occurrence
    clock = Math.min(time_of_arrival, time_of_service_completion, stop_time);
    // dispatch based on which kind of event occurred
    if (clock === time_of_service_completion) {
	if (length_of_waiting_line > 0) {
	    length_of_waiting_line -= 1;
	    time_of_service_completion = clock + random(service_time_lower, service_time_upper);
	} else {
	    idle = true;
	    time_of_service_completion = stop_time + 1; // TODO
	}
    } else if (clock === stop_time) {
	print('interarrival times were in [' +
	      interarrival_time_lower + ', ' +
	      interarrival_time_upper + ')');
	print('service times were in [' +
	      service_time_lower + ', ' +
	      service_time_upper + ')');
	print('stop time was ' + stop_time);
	print('max length of waiting line was ' + max_length_of_waiting_line);
	break;
    } else {
	if (clock !== time_of_arrival) {
	    throw 'clock should equal time of arrival';
	}
	time_of_arrival = clock + random(interarrival_time_lower, interarrival_time_upper);
	if (idle === 1) {
	    idle = 0; // TODO
	    time_of_service_completion = clock + random(service_time_lower, service_time_upper);
	} else {
	    length_of_waiting_line += 1;
	    max_length_of_waiting_line = Math.max(length_of_waiting_line, max_length_of_waiting_line);
	}
    }
}
