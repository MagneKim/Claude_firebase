import React, { useState, useEffect } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { Calendar, MapPin, Users, MessageSquare, LogOut, Plus, Trash2 } from 'lucide-react';

// Firebase 설정 - 여기에 본인의 Firebase 설정값을 입력하세요
const firebaseConfig = {
  apiKey: "AIzaSyABcY2_TEygS8ColgbcKRjIU99LgK85lxs",
  authDomain: "magne-d4a00.firebaseapp.com",
  projectId: "magne-d4a00",
  storageBucket: "magne-d4a00.firebasestorage.app",
  messagingSenderId: "433155653567",
  appId: "1:433155653567:web:3b075e3a55ca921ac32b0a"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const EventScheduler = () => {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  
  const [events, setEvents] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // 새 이벤트 폼
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    locationUrl: ''
  });
  
  // 댓글
  const [newComment, setNewComment] = useState('');

  // 관리자 이메일 목록 (본인의 이메일을 추가하세요)
  const ADMIN_EMAILS = ['byungwook.kang@tanabe-pharma.com', 'yunjeong.kim@tanabe-pharma.com', 'jungyeon.lee@tanabe-pharma.com', 'ramek.kim@tanabe-pharma.com', 'jihye.kim@tanabe-pharma.com', 'mingyo.kim@tanabe-pharma.com'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadEvents();
      }
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = () => {
    return user && ADMIN_EMAILS.includes(user.email);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // 사용자 프로필에 이름 저장 (선택사항)
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
          displayName: displayName,
          email: email,
          createdAt: serverTimestamp()
        }).catch(() => {
          // users 컬렉션이 없으면 생성
          addDoc(collection(db, 'users'), {
            uid: userCredential.user.uid,
            displayName: displayName,
            email: email,
            createdAt: serverTimestamp()
          });
        });
      }
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setEvents([]);
      setSelectedEvent(null);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEvents = async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      const loadedEvents = [];
      querySnapshot.forEach((doc) => {
        loadedEvents.push({ id: doc.id, ...doc.data() });
      });
      setEvents(loadedEvents);
    } catch (err) {
      console.error('이벤트 로드 실패:', err);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    if (!isAdmin()) {
      alert('관리자만 일정을 등록할 수 있습니다.');
      return;
    }

    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        createdBy: user.email,
        createdAt: serverTimestamp(),
        attendees: [],
        comments: []
      });
      
      setNewEvent({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        locationUrl: ''
      });
      setShowCreateEvent(false);
      loadEvents();
    } catch (err) {
      console.error('이벤트 생성 실패:', err);
      alert('이벤트 생성에 실패했습니다.');
    }
  };

  const toggleAttendance = async (eventId, isAttending) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      const attendeeData = {
        email: user.email,
        joinedAt: new Date().toISOString()
      };

      if (isAttending) {
        await updateDoc(eventRef, {
          attendees: arrayRemove(attendeeData)
        });
      } else {
        await updateDoc(eventRef, {
          attendees: arrayUnion(attendeeData)
        });
      }
      loadEvents();
    } catch (err) {
      console.error('참석 등록 실패:', err);
    }
  };

  const addComment = async (eventId) => {
    if (!newComment.trim()) return;

    try {
      const eventRef = doc(db, 'events', eventId);
      const commentData = {
        text: newComment,
        author: user.email,
        createdAt: new Date().toISOString()
      };

      await updateDoc(eventRef, {
        comments: arrayUnion(commentData)
      });

      setNewComment('');
      loadEvents();
    } catch (err) {
      console.error('댓글 추가 실패:', err);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!isAdmin()) return;
    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'events', eventId));
      loadEvents();
      setSelectedEvent(null);
    } catch (err) {
      console.error('이벤트 삭제 실패:', err);
    }
  };

  // 로그인/회원가입 화면
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Pretendard', -apple-system, sans-serif"
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '48px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Calendar size={48} color="#667eea" style={{ marginBottom: '16px' }} />
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1a202c', margin: '0 0 8px 0' }}>
              일정 관리
            </h1>
            <p style={{ color: '#718096', fontSize: '16px', margin: 0 }}>
              함께하는 일정을 쉽게 관리하세요
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#f7fafc', borderRadius: '12px', padding: '4px' }}>
            <button
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: isLogin ? '#667eea' : 'transparent',
                color: isLogin ? 'white' : '#4a5568',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              로그인
            </button>
            <button
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                background: !isLogin ? '#667eea' : 'transparent',
                color: !isLogin ? 'white' : '#4a5568',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isLogin && (
              <input
                type="text"
                placeholder="이름"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={!isLogin}
                style={{
                  padding: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            )}
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <input
              type="password"
              placeholder="비밀번호 (최소 6자)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            {error && (
              <p style={{ color: '#e53e3e', fontSize: '14px', margin: 0 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              style={{
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {isLogin ? '로그인' : '회원가입'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 메인 앱 화면
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: "'Pretendard', -apple-system, sans-serif"
    }}>
      {/* 헤더 */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 24px',
        background: 'white',
        borderRadius: '16px',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={32} color="#667eea" />
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1a202c', margin: 0 }}>
            일정 관리
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#4a5568', fontSize: '14px' }}>
            {user.email}
            {isAdmin() && <span style={{ 
              marginLeft: '8px', 
              padding: '4px 8px', 
              background: '#667eea', 
              color: 'white', 
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}>관리자</span>}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: '#e2e8f0',
              color: '#4a5568',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#cbd5e0'}
            onMouseOut={(e) => e.target.style.background = '#e2e8f0'}
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 일정 생성 버튼 (관리자만) */}
        {isAdmin() && (
          <button
            onClick={() => setShowCreateEvent(!showCreateEvent)}
            style={{
              width: '100%',
              padding: '16px',
              border: 'none',
              borderRadius: '16px',
              background: 'white',
              color: '#667eea',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 30px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            }}
          >
            <Plus size={20} />
            새 일정 만들기
          </button>
        )}

        {/* 일정 생성 폼 */}
        {showCreateEvent && isAdmin() && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', marginTop: 0 }}>
              새 일정 등록
            </h2>
            <form onSubmit={createEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                placeholder="일정 제목"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                required
                style={{
                  padding: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <textarea
                placeholder="일정 설명"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                required
                rows={4}
                style={{
                  padding: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  required
                  style={{
                    padding: '16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  required
                  style={{
                    padding: '16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>
              <input
                type="text"
                placeholder="장소"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                required
                style={{
                  padding: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <input
                type="url"
                placeholder="지도 링크 (Google Maps, Kakao Map 등)"
                value={newEvent.locationUrl}
                onChange={(e) => setNewEvent({...newEvent, locationUrl: e.target.value})}
                style={{
                  padding: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '16px',
                    border: 'none',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  일정 등록
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateEvent(false)}
                  style={{
                    padding: '16px 24px',
                    border: 'none',
                    borderRadius: '12px',
                    background: '#e2e8f0',
                    color: '#4a5568',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 일정 목록 */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {events.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '48px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Calendar size={64} color="#cbd5e0" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#718096', fontSize: '18px' }}>
                등록된 일정이 없습니다
              </p>
            </div>
          ) : (
            events.map((event) => {
              const isAttending = event.attendees?.some(a => a.email === user.email);
              const isSelected = selectedEvent?.id === event.id;
              
              return (
                <div
                  key={event.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '28px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedEvent(isSelected ? null : event)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', margin: '0 0 8px 0' }}>
                        {event.title}
                      </h3>
                      <p style={{ color: '#718096', fontSize: '16px', margin: 0 }}>
                        {event.description}
                      </p>
                    </div>
                    {isAdmin() && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(event.id);
                        }}
                        style={{
                          padding: '8px',
                          border: 'none',
                          borderRadius: '8px',
                          background: '#fee',
                          color: '#c53030',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    padding: '16px',
                    background: '#f7fafc',
                    borderRadius: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={20} color="#667eea" />
                      <span style={{ color: '#4a5568', fontWeight: '500' }}>
                        {event.date} {event.time}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={20} color="#667eea" />
                      <span style={{ color: '#4a5568', fontWeight: '500' }}>
                        {event.location}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} color="#667eea" />
                      <span style={{ color: '#4a5568', fontWeight: '500' }}>
                        {event.attendees?.length || 0}명 참석
                      </span>
                    </div>
                  </div>

                  {event.locationUrl && (
                    <a
                      href={event.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: '#e6fffa',
                        color: '#047857',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '14px',
                        marginBottom: '16px'
                      }}
                    >
                      <MapPin size={16} />
                      지도에서 보기
                    </a>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAttendance(event.id, isAttending);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      border: 'none',
                      borderRadius: '12px',
                      background: isAttending 
                        ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: '16px'
                    }}
                  >
                    {isAttending ? '✓ 참석 중' : '참석하기'}
                  </button>

                  {/* 상세 정보 (펼쳤을 때만 표시) */}
                  {isSelected && (
                    <div style={{ 
                      marginTop: '24px', 
                      paddingTop: '24px', 
                      borderTop: '2px solid #e2e8f0',
                      animation: 'fadeIn 0.3s ease-in'
                    }}>
                      {/* 참석자 명단 */}
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ 
                          fontSize: '18px', 
                          fontWeight: '700', 
                          color: '#1a202c', 
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Users size={20} />
                          참석자 명단 ({event.attendees?.length || 0}명)
                        </h4>
                        {event.attendees && event.attendees.length > 0 ? (
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '8px' 
                          }}>
                            {event.attendees.map((attendee, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '8px 16px',
                                  background: attendee.email === user.email ? '#667eea' : '#e6fffa',
                                  color: attendee.email === user.email ? 'white' : '#047857',
                                  borderRadius: '20px',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}
                              >
                                {attendee.email}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#718096', fontSize: '14px' }}>
                            아직 참석자가 없습니다
                          </p>
                        )}
                      </div>

                      {/* 댓글 섹션 */}
                      <div>
                        <h4 style={{ 
                          fontSize: '18px', 
                          fontWeight: '700', 
                          color: '#1a202c', 
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <MessageSquare size={20} />
                          댓글 ({event.comments?.length || 0})
                        </h4>
                        
                        {/* 댓글 목록 */}
                        <div style={{ marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                          {event.comments && event.comments.length > 0 ? (
                            event.comments.map((comment, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '12px',
                                  background: '#f7fafc',
                                  borderRadius: '12px',
                                  marginBottom: '8px'
                                }}
                              >
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '4px' 
                                }}>
                                  <span style={{ 
                                    fontWeight: '600', 
                                    color: '#4a5568',
                                    fontSize: '14px'
                                  }}>
                                    {comment.author}
                                  </span>
                                  <span style={{ 
                                    fontSize: '12px', 
                                    color: '#a0aec0' 
                                  }}>
                                    {new Date(comment.createdAt).toLocaleString('ko-KR')}
                                  </span>
                                </div>
                                <p style={{ 
                                  color: '#2d3748', 
                                  margin: 0,
                                  fontSize: '15px',
                                  lineHeight: '1.6'
                                }}>
                                  {comment.text}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: '#718096', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                              첫 댓글을 남겨보세요!
                            </p>
                          )}
                        </div>

                        {/* 댓글 작성 */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="댓글을 입력하세요..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                addComment(event.id);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              border: '2px solid #e2e8f0',
                              borderRadius: '12px',
                              fontSize: '15px',
                              outline: 'none'
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addComment(event.id);
                            }}
                            style={{
                              padding: '12px 24px',
                              border: 'none',
                              borderRadius: '12px',
                              background: '#667eea',
                              color: 'white',
                              fontSize: '15px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            작성
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default EventScheduler;
