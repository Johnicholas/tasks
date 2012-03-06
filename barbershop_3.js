// A flat distribution over the integers between a lower and upper bound.
// including the lower bound and excluding the upper.
function Flat(lower, upper) {
    this.lower = lower
    this.upper = upper
}
Flat.prototype.generate = function () {
    return Math.floor(
	Math.random() * (this.upper - this.lower)
    ) + this.lower
}
Flat.prototype.toString = function () {
    return '[' + this.lower + ', ' + this.upper + ')';
}
// Device represents a relatively long-lived
// resource, station, or stopping point in the system.
// At most one customer can use a facility at one time.
function Device(distribution) {
    this.distribution = distribution
    this.current = null
    this.waiting_line = []
    this.max_length = 0
}
// Device fulfills the block interface.
// As a block, Device represents the start of a service.
Device.prototype.accept = function (s, customer) {
    if (this.current === null) {
	this.start(s, customer)
    } else {
	customer.waiting()
	this.waiting_line.push(customer)
	this.max_length = Math.max(this.waiting_line.length,
				   this.max_length)
    }
}
// Device's start method is a convenient helper method,
// that should not be called directly by a client of Factory.
// It is just factoring out some repetition between accept and execute.
Device.prototype.start = function (s, customer) {
    customer.starting()
    this.current = customer
    s.schedule(this.distribution.generate(), this)
}
// Device fulfills the task interface.
// As a task, Device represents the completion of a service.
Device.prototype.execute = function (s) {
    var done_customer = this.current
    done_customer.done()
    if (this.waiting_line.length > 0) {
	var new_customer = this.waiting_line.shift()
	this.start(s, new_customer)
    } else {
	this.current = null
    }
    done_customer.execute(s)
}
// Generate is a task that generates new customers,
// according to a specific interarrival distribution.
function Generate(distribution, task_maker) {
    this.distribution = distribution
    this.task_maker = task_maker
}
Generate.prototype.execute = function (s) {
    var new_task = new (this.task_maker)()
    s.schedule(0, new_task)
    s.schedule(this.distribution.generate(), this)
}
// Scheduler is a simple multi-tasking thingum.
function Scheduler() {
    this.clock = 0
    this.upcoming_events = []
    this.running = true
    this.devices = {}
}
// Step is the primary entry point for the scheduler.
Scheduler.prototype.step = function () {
    this.upcoming_events.sort(function (a, b) { return b.time - a.time })
    var current_event = this.upcoming_events.pop()
    this.clock = current_event.time
    current_event.task.execute(this)
}
// Schedule is a service for the tasks,
// and also a mutator for initial configuration
Scheduler.prototype.schedule = function (delay, task) {
    this.upcoming_events.push({time: this.clock + delay, task: task})
    return this
}
// AddDevice is a mutator.
Scheduler.prototype.addDevice = function (id, service_distribution) {
    this.devices[id] = new Device(service_distribution)
    return this
}
// Stop is a service for the tasks.
Scheduler.prototype.stop = function () {
    this.running = false
}
// GetDeviceById is a service for the tasks.
Scheduler.prototype.getDeviceById = function (id) {
    return this.devices[id]
}

// The barbershop customer task acquires the barber,
// Note that each customer gets a unique number.
function BarbershopCustomer() {
    this.number = BarbershopCustomer.count
    this.hair_todo = true
    BarbershopCustomer.count += 1
}
BarbershopCustomer.count = 0
BarbershopCustomer.prototype.toString = function () {
    return "Customer" + this.number
}
BarbershopCustomer.prototype.execute = function (s) {
    if (this.hair_todo) {
	print(this + " arrives.")
	var barber = s.getDeviceById('barber')
	barber.accept(s, this)
    } else {
	print(this + " pays and leaves.")
    }
}
BarbershopCustomer.prototype.starting = function () {
    print(this + " sits down to get their hair cut.")
}
BarbershopCustomer.prototype.waiting = function () {
    print(this + " takes a spot in line.")
}
BarbershopCustomer.prototype.done = function () {
    print(this + " finishes their haircut.")
    this.hair_todo = false
}
// Configure the simulation
var interarrival_time = new Flat(1, 25)
var service_time = new Flat(5, 15)
var stop_time = 8 * 60
var barbershop = new Scheduler()
    .addDevice('barber', service_time)
    .schedule(0, new Generate(interarrival_time, BarbershopCustomer))
    .schedule(stop_time, { execute: function (s) { s.stop() } })
// Run the simulation
do {
    barbershop.step()
} while (barbershop.running);
// Report on the simulation
print('interarrival times were in ' + interarrival_time);
print('service times were in ' + service_time);
print('stop time was ' + stop_time);
print('max length of waiting line was ' +
      barbershop.getDeviceById('barber').max_length)
