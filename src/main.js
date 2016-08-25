/**
 * This file exports the index object for Extendable Yeoman.
 *
 * Yeoman is a layer on top of the main Yeoman object base. This exports
 * an object fully compatible with the main Yeoman object that can be used
 * in it's stead to create Yeoman generators that are extendable.
 */
import Yeoman from 'yeoman-generator';
import Base from './base';

const Main = {
	Yeoman: Yeoman,
	Base: Base
};

export default Main;
export {Yeoman, Base};
