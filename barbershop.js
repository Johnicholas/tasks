// -*- Javascript -*-
'use strict';

// This barbershop simulation depends on task (version 6 is good),
// and a print function
function Barbershop(print, task) {
    // A distribution is something that has a generate method,
    // that generates numbers randomly according to some distribution
    //
    // A flat distribution over the integers between a lower and upper bound.
    // including the lower bound and excluding the upper.
    // 
    // It's used in the barbershop simulation.
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


    // BarbershopCustomer is simple task;
    // customers get their hair cut, which
    // takes a barber and a random amount of service time,
    // and then they 'leave' - there is no die command,
    // so they just don't do anything more.
    function BarbershopCustomer() {
	this.number = BarbershopCustomer.count
	this.state = 0
	BarbershopCustomer.count += 1
    }
    BarbershopCustomer.count = 0
    BarbershopCustomer.service_time = new Flat(5, 15)
    BarbershopCustomer.prototype.toString = function () {
	return 'Customer' + this.number
    }
    BarbershopCustomer.prototype.step = function (s, message_ignored) {
	var answer
	switch (this.state) {
	case 0:
            answer = s.acquire('barber')
            this.state += 1
            break
	case 1:
            print(this + ' sits down to get their hair cut.')
            answer = s.sleep(BarbershopCustomer.service_time.generate())
            this.state += 1
            break
	case 2:
            print(this + ' finishes their haircut, pays and leaves')
            // more properly this should be 'die',
            // but it's equivalent since we won't get any messages
            answer = s.wait()
            answer.release('barber')
            this.state += 1
            break
	case 3:
            throw 'unexpected step in '+this.toString()
            break
	}
	return answer
    }

    // BarbershopClosing is another simple task
    // It's responsible for waiting until closing time,
    // and then stopping the simulation.
    function BarbershopClosing() {
	this.state = 0
    }
    BarbershopClosing.prototype.step = function (s, message_ignored) {
	var answer
	switch (this.state) {
	case 0:
            answer = s.sleep(8 * 60)
            this.state += 1
            break
	case 1:
            answer = s.wait()
            answer.stop()
            this.state += 1
            break
	default:
            throw 'this should never happen!'
            break
	}
	return answer
    }

    // BarbershopGenerator is a simple task
    // It's responsible for generating customers intermittently.
    function BarbershopGenerator() {
	this.state = 0
    }
    BarbershopGenerator.interarrival_time = new Flat(1, 25)
    BarbershopGenerator.prototype.step = function (s, message_ignored) {
	var answer
	var customer
	switch (this.state) {
	case 0:
            answer = s.sleep(BarbershopGenerator.interarrival_time.generate())
            this.state = 1
            break
	case 1:
            answer = s.sleep(BarbershopGenerator.interarrival_time.generate())
            customer = new BarbershopCustomer()
            print(customer+' arrives.')
            answer.spawn(customer.toString(), customer)
            this.state = 1 // note: stay in the same state
            break
	default:
            throw 'this should never happen!'
            break
	}
	return answer
    }

    // Configure the simulation
    var generator = new BarbershopGenerator()
    var closing = new BarbershopClosing()
    var barbershop = new task.Scheduler()
    barbershop.addResource('barber')
    barbershop.spawn('generator', generator)
    barbershop.spawn('closing', closing)
    // Run the simulation
    while (barbershop.running) {
	barbershop.step()
    }
}
