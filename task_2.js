// Scheduler is an interface describing something that can produce SchedulerCommands.
// Scheduler has a run() method that produces a SchedulerCommand.
//  "I am yielding control but I am ready to run again."
// Scheduler has a wait() method that produces a SchedulerCommand.
//  "Wake me up when someone sends a message to me."
// Scheduler has a sleep(interval) method that produces a SchedulerCommand.
//  "Wake me up after this interval of time."
// Scheduler has a acquire(resource) method that produces a SchedulerCommand.
//  "Put me on the list for this resource, and wake me when I can have it."
// Note: there is no 'die' method, though it might be reasonable.
//
// SchedulerCommand is an interface.
// SchedulerCommand has a stop() method that returns nothing.
//  "Stop everything, we're done here."
// SchedulerCommand has a send(to_whom, message) method that returns nothing.
//  "Please deliver this to so-and-so."
// SchedulerCommand has a release(resource) method that returns nothing.
//  "I'm done with this, you can give it to someone else."
// Note: there is no 'spawn' method, though it might be reasonable.
//
// These classes Run, Wait, Sleep, Acquire are scheduler commands.
function Run() {
}
Run.prototype.accept = function (visitor) {
    visitor.run()
}
function Wait() {
}
Wait.prototype.accept = function (visitor) {
    visitor.wait()
}
function Sleep(interval) {
    this.interval = interval
}
Sleep.prototype.accept = function (visitor) {
    visitor.sleep(this.interval)
}
function Acquire(resource) {
    this.resource = resource
}
Acquire.prototype.accept = function (visitor) {
    visitor.acquire(this.resource)
}
// These classes stop, send, release are scheduler commands
// In particular, they're scheduler command adapters,
// that wrap an existing scheduler command and modify it,
// to do something else in addition.
function Stop(rest) {
    this.rest = rest
}
Stop.prototype.accept = function (visitor) {
    visitor.stop()
    this.rest.accept(visitor)
}
function Send(address, message, rest) {
    this.address = address
    this.message = message
    this.rest = rest
}
Send.prototype.accept = function (visitor) {
    visitor.send(this.address, this.message)
    this.rest.accept(visitor)
}
function Release(resource, rest) {
    this.resource = resource
    this.rest = rest
}
Release.prototype.accept = function (visitor) {
    visitor.release(this.resource)
    this.rest.accept(visitor)
}
// CommandPrinter is a scheduler command visitor
// that prints what it sees
function CommandPrinter() {
}
CommandPrinter.prototype.run = function () {
    print('run')
}
CommandPrinter.prototype.wait = function () {
    print('wait')
}
CommandPrinter.prototype.sleep = function (interval) {
    print('sleep for '+interval)
}
CommandPrinter.prototype.acquire = function (resource) {
    print('acquire '+resource)
}
CommandPrinter.prototype.stop = function () {
    print('stop')
}
CommandPrinter.prototype.send = function (address, message) {
    print('send (to '+address+') "'+message+'"')
}
CommandPrinter.prototype.release = function (resource) {
    print('release '+resource)
}

// RecordSchedulerCommand is an implementation of SchedulerCommand
function RecordSchedulerCommand(initial) {
    this.command = initial
}
RecordSchedulerCommand.prototype.stop = function () {
    this.command = new Stop(this.command)
}
RecordSchedulerCommand.prototype.send = function (address, message) {
    this.command = new Send(address, message, this.command)
}
RecordSchedulerCommand.prototype.release = function (resource) {
    this.command = new Release(resource, this.command)
}
RecordSchedulerCommand.prototype.print = function () {
    this.command.accept(new CommandPrinter)
}

// RecordScheduler is an implementation of Scheduler 
// that produces RecordSchedulerCommands.
function RecordScheduler() {
}
RecordScheduler.prototype.run = function () {
    return new RecordSchedulerCommand(new Run())
}
RecordScheduler.prototype.wait = function () {
    return new RecordSchedulerCommand(new Wait())
}
RecordScheduler.prototype.sleep = function (interval) {
    return new RecordSchedulerCommand(new Sleep(interval))
}
RecordScheduler.prototype.acquire = function (resource) {
    return new RecordSchedulerCommand(new Acquire(resource))
}

// A task is an interface
// A task has a method, step, that takes a Scheduler and possibly a message
// and returns a SchedulerCommand produced from that Scheduler.
// It should not keep the Scheduler around.
//
// Chores is an example task, using a simple switch-based state machine.
function Chores() {
    this.state = 0
}
Chores.prototype.step = function (scheduler, message) {
    var answer;
    switch (this.state) {
    case 0:
	answer = scheduler.acquire('human')
	this.state = 1
	break
    case 1:
	answer = scheduler.wait()
	answer.send('human', 'time to chop the wood')
	this.state = 2
	break
    case 2:
	// assume the message is correct for now
	answer = scheduler.acquire('human')
	answer.release('human')
	this.state = 3
	break
    case 3:
	answer = scheduler.wait()
	answer.send('human', 'time to carry the water')
	this.state = 4
	break
    case 4:
	// assume the message is correct for now
	answer = scheduler.sleep('1 day')
	answer.release('human')
	this.state = 0
	break;
    }
    return answer
}

// a simple print-based scheduler loop
var chores = new Chores()
var scheduler = new RecordScheduler()
for (var i = 0; i < 8; ++i) {
    print('step '+i)
    var command = chores.step(scheduler)
    command.print()
}
