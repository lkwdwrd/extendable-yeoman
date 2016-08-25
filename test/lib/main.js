import chai from 'chai';
import Yeoman from 'yeoman-generator';
import main from '../../lib/main';
import Base from '../../lib/base';

chai.should();

describe('The main object', function () {
	it('contains a Yeoman reference', function(){
		main.Yeoman.should.equal(Yeoman);
	});
	it('contains the extended Base object', function(){
		main.Base.should.equal(Base);
	});
});
