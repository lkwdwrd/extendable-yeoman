import chai from 'chai';
import Yeoman from 'yeoman-generator';
import main from '../../lib/main';
import Base from '../../lib/base';

chai.should();

describe('The main object', () => {
	it('contains a Yeoman reference', () => {
		main.Yeoman.should.equal(Yeoman);
	});
	it('contains the extended Base object', () => {
		main.Base.should.equal(Base);
	});
});
