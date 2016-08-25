import {assert} from 'chai';
import Yeoman from 'yeoman-generator';
import main from '../../lib/main';
import Base from '../../lib/base';

describe('The main object', function(){
	it('contains a Yeoman reference', function(){
		assert.equal(main.Yeoman, Yeoman);
	});
	it('contains the extended Base object', function(){
		assert.equal(main.Base, Base);
	});
});
