// utilities

// generate a random integer between the lower and upper bound,
// including lower and excluding upper.
function random(lower, upper) {
    return Math.floor(Math.random() * (upper - lower)) + lower;
}

// reusable classes

// A flat distribution over the integers between a lower and upper bound.
function FlatDistribution(lower, upper) {
    this.lower = lower;
    this.upper = upper;
}
FlatDistribution.prototype.generate = function () {
    return random(this.lower, this.upper);
}

// A customer flows through the system.
// Note that there is a static or 'class' variable,
// that ensures that each customer gets a unique number.
function Customer() {
    this.number = Customer.count;
    Customer.count += 1;
}
Customer.count = 0;
Customer.prototype.toString = function () {
    return "Customer" + this.number;
}

// Facility represents a relatively long-lived
// resource, station, or stopping point in the system.
// At most one customer can use a facility at one time.
function Facility(distribution, next) {
    this.distribution = distribution;
    this.current = null;
    this.waiting_line = [];
    this.max_length_of_waiting_line = 0;
    this.next = next;
}
// Facility fulfills the block interface.
// As a block, Facility represents the start of a service.
Facility.prototype.accept = function (s, customer) {
    print(customer + " arrives");
    if (this.current === null) {
	this.start(s, customer);
    } else {
	print(customer + " arrives and takes a spot in line.");
	this.waiting_line.push(customer);
	this.max_length_of_waiting_line = Math.max(this.waiting_line.length,
						   this.max_length_of_waiting_line);
    }
}
// Facility's start method is a convenient helper method,
// that should not be called directly by a client of Factory.
// It is just factoring out some repetition between accept and execute.
Facility.prototype.start = function (s, customer) {
    print(customer + " sits down to get their hair cut.");
    this.current = customer;
    s.schedule(this.distribution.generate(), this);
}
// Facility fulfills the task interface;
// as a task, Facility represents the completion of a service.
Facility.prototype.execute = function (s) {
    var customer_done = this.current;
    this.current = null;
    print(customer_done + " finishes their haircut, pays and leaves.");
    if (this.waiting_line.length > 0) {
	var new_customer = this.waiting_line.shift();
	print(new_customer + " gets to the head of the line.");
	this.start(s, new_customer);
    } else {
	print("Joe the Barber takes a rest.");
	this.current = null;
    }
    // pass the buck to whoever is next in line
    this.next.accept(customer_done);
}

// Generate is a task that generates new customers,
// according to a specific interarrival distribution.
function Generate(distribution, next) {
    this.distribution = distribution;
    this.next = next;
}
Generate.prototype.execute = function (s) {
    this.next.accept(s, new Customer());
    // Arrange for this to also be executed later.
    s.schedule(this.distribution.generate(), this);
}

// Stop is a task that stops the simulation,
// so that we can simulate for a fixed amount of
// (simulated) time.
function Stop() {
}
Stop.prototype.execute = function (s) { s.stop(); }

// Destroy is a block that destroys the incoming
// customers.
function Destroy() {
}
Destroy.prototype.accept = function (s, customer) {
    // Do nothing - on purpose
}

// Simulation is the center of a discrete-event simulation,
// 
function Simulation() {
    this.clock = 0;
    this.upcoming_events = [];
    this.running = true;
}
// Run is the primary entry point for Simulation,
// and an example usage of step, in case you need
// to use step directly.
Simulation.prototype.run = function () {
    do {
	this.step();
    } while (this.running);
}
// Step is the secondary entry point for Simulation.
Simulation.prototype.step = function () {
    this.upcoming_events.sort(function (a, b) { return b.time - a.time; });
    var current_event = this.upcoming_events.pop();
    this.clock = current_event.time;
    print("the time is now " + this.clock);
    current_event.task.execute(this);
}
// Schedule is a service for the tasks,
// and also a mutator for initial configuration
Simulation.prototype.schedule = function (delay, task) {
    this.upcoming_events.push({time: this.clock + delay, task: task});
    return this;
}
Simulation.prototype.stop = function () {
    this.running = false;
}

// configuration
var interarrival_time = new FlatDistribution(1, 25);
var service_time = new FlatDistribution(5, 15);
var stop_time = 8 * 60;
var barber = new Facility(service_time, new Destroy());
var barbershop = new Simulation()
    .schedule(0, new Generate(interarrival_time, barber))
    .schedule(stop_time, new Stop());

barbershop.run();

// Report configuration and metrics
print('interarrival times were in [' +
      interarrival_time.lower + ', ' +
      interarrival_time.upper + ')');
print('service times were in [' +
      service_time.lower + ', ' +
      service_time.upper + ')');
print('stop time was ' + stop_time);
print('max length of waiting line was ' +
      barber.max_length_of_waiting_line);
