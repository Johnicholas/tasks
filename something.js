function Foo(link, number) {
    this.link = link
    this.number = number
}
Foo.prototype.print = function () {
    print(this.number)
    this.link.print()
}
function Bar() {
}
Bar.prototype.print = function () {
    print('bar')
}
function build_foo(count) {
    var accumulator = new Bar()
    for (var i = 0; i < count; ++i) {
	accumulator = new Foo(accumulator, i)
    }
    return accumulator
}

build_foo(4).print()

